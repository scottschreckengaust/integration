import { APIGatewayEvent } from 'aws-lambda';
import * as crypto from 'crypto';
import GitHubAppHelper, { AApp } from './github-app-helper';
import { 
    X_GITHUB_INSTALLATION_TARGET_ID,
    X_HUB_SIGNATURE_256,
 } from './processGithubWebhook';

export const verifySignature = async (event: APIGatewayEvent) => {
    const gitHubSignature256Header = event.headers[X_HUB_SIGNATURE_256];
    if ((gitHubSignature256Header === undefined) || (gitHubSignature256Header === null)) {
        console.warn(`Missing "${X_HUB_SIGNATURE_256}" in headers`);
        return false;
    }
    if (!(X_GITHUB_INSTALLATION_TARGET_ID in event.headers) || Number.isInteger(event.headers[X_GITHUB_INSTALLATION_TARGET_ID])) {
        console.warn(`Missing "${X_GITHUB_INSTALLATION_TARGET_ID}" in headers`);
        return false;
    }

    // The GitHub app webhook secret from AWS Secrets Manager
    const githubAppHelper = GitHubAppHelper.getInstance();
    const appId = Number(event.headers[X_GITHUB_INSTALLATION_TARGET_ID]);
    const webHookSecret = (await githubAppHelper.getApp(appId)).getWebhookSecret();

    const signature = crypto
        .createHmac("sha256", webHookSecret)
        .update(String(event.body), 'ascii')
        .digest("hex");
    let trusted = Buffer.from(`sha256=${signature}`, 'ascii');
    let untrusted = Buffer.from(gitHubSignature256Header, 'ascii');
    return crypto.timingSafeEqual(trusted, untrusted);
};
