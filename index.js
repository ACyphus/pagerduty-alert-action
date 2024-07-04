const core = require('@actions/core');
const { context } = require('@actions/github');
const axios = require('axios');

// Trigger the PagerDuty webhook with a given alert
async function sendAlert(alert) {
  core.info('Sending API call');

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await axios.post('https://events.pagerduty.com/v2/enqueue', alert, {headers: headers});

  if (response.status === 202) {
    core.info(`Successfully sent PagerDuty alert. Response: ${JSON.stringify(response.data)}`);
  } else {
    core.error(`PagerDuty API returned status code ${response.status} - ${JSON.stringify(response.data)}`);
    core.setFailed(
      `PagerDuty API returned status code ${response.status} - ${JSON.stringify(response.data)}`
    );
  }
}

// Run the action
(async () => {
  const integrationKey = core.getInput('pagerduty-integration-key');
  core.info('Reading pagerduty-integration-key');

  let alert = {
    payload: {
      summary: `New high urgency security report by @${context.actor}`,
      timestamp: new Date().toISOString(),
      source: 'GitHub Actions',
      severity: 'critical',
      custom_details: {
        run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
      },
    },
    // Not sure why we see an extra `$` sign at the front of the key, but
    // skipping the first char here to make a correct API call.
    routing_key: integrationKey.substring(1),
    event_action: 'trigger',
  };
  core.info('Forming default request body');

  const customSummary = core.getInput('incident-summary');
  if (customSummary != '') {
    alert.payload.summary = customSummary;
  }

  const region = core.getInput('incident-region');
  if (region != '') {
    alert.payload.custom_details.region = region;
  }

  const environment = core.getInput('incident-environment');
  if (environment != '') {
    alert.payload.custom_details.environment = environment;
  }

  const dedupKey = core.getInput('pagerduty-dedup-key');
  if (dedupKey != '') {
    alert.dedup_key = dedupKey;
  }
  core.info('Customizing request body');

  await sendAlert(alert);
})();
