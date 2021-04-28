import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeploymentReview, DemoReview } from '../DemoDeploymentReview';
import { getOctokit, getRequiredInput } from '../util';

async function run() {
  try {
    await exec();
  } catch (err) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const warningActiveDays: number = parseInt(getRequiredInput('warn_active_days'));
  const maxActiveDays: number = parseInt(getRequiredInput('terminate_active_days'));

  const demoReview = await DemoDeploymentReview.createDemoReview(getOctokit(), github.context.repo, github.context.ref);
  const analysis = await demoReview.analyze(warningActiveDays, maxActiveDays);

  core.info(`Demo deployment analysis`);
  reportErrors(analysis.errored);
  reportWarnings(analysis.to_warn);
  reportTerminations(analysis.to_terminate);

  setOutput('deployments_to_warn', analysis.to_warn);
  setOutput('deployments_to_terminate', analysis.to_terminate);
}

function setOutputValue(name, value) {
  core.info(`setting output ${name}=${value}`);
  core.setOutput(name, value);
}

function setOutput(name, reviews?: DemoReview[]) {
  setOutputValue(`${name}_count`, reviews ? reviews.length : 0)


  if (reviews && reviews.length > 0) {
    const payload = reviews.map(review => {
      return {
        id: review.demo.id,
        name: review.demo.name,
      };
    });

    setOutputValue(`${name}_json`, JSON.stringify(payload));
  }
}

function reportTerminations(reviews?: DemoReview[]) {
  core.startGroup(`Terminations - ${reviews ? reviews.length : 0}`);

  reviews?.forEach((review: DemoReview) => {
    displayDemoReview(review);
  });

  core.endGroup();
}

function reportWarnings(reviews?: DemoReview[]) {
  core.startGroup(`Warnings - ${reviews ? reviews.length : 0}`);

  reviews?.forEach((review: DemoReview) => {
    displayDemoReview(review);
  });

  core.endGroup();
}

function reportErrors(reviews?: DemoReview[]) {
  core.startGroup(`Errors - ${reviews ? reviews.length : 0}`);

  reviews?.forEach((review: DemoReview) => {
    displayDemoReview(review);
  });

  core.endGroup();
}

function displayDemoReview(review: DemoReview) {
  core.info(`${review.demo.name} id:${review.demo.id}`);
  core.info(`  status:       ${review.status}`);
  core.info(`  description:  ${review.description}`);
  core.info(`  active days:  ${review.active_days}`);
  if (review.issue) {
    core.info(`  tracking issue:`);
    core.info(`    id: ${review.issue.id}`);
    if (review.issue.labels) {
      core.info(`    labels: ${JSON.stringify(review.issue.labels)}`);
    }
    core.info(`    url: https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/issues/${review.issue.id}`);
  }
}