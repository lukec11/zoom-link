require('dotenv').config();

const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const wc = new WebClient(process.env.SLACK_OAUTH_TOKEN);

const getMessage = async (channel, ts) => {
    return await wc.conversations.history({
        token: process.env.SLACK_TOKEN,
        channel: channel,
        inclusive: true,
        limit: 1,
        oldest: ts,
        latest: ts
    })
}

const sendMessage = async (channel, text, user) => {
    await wc.chat.postEphemeral({
        token: process.env.SLACK_TOKEN,
        channel: channel,
        text: text,
        user: user
    })
}

slackEvents.on('reaction_added', async event => {
    console.log(`${event.user} added reaction ${event.reaction} to ${event.item.ts} in ${event.item.channel}`)
    if (event.reaction == 'link') {
        let itemInfo;
        try {
            itemInfo = await getMessage(event.item.channel, event.item.ts);
        } catch (err) {
            console.error(`Couldn't get history - ${err}`);
        }

        if (itemInfo.messages[0].text.match(/[A-za-z0-9]+? has started a meeting/gi)) {
            try {
                const zoomLink = await itemInfo.messages[0].blocks[0].call.v1.join_url;
                console.log(`Zoom link: ${zoomLink}`)
                await sendMessage(
                    event.item.channel,
                    `<@${event.user}>: <${zoomLink}|Here's a link> to the zoom call you requested!`,
                    event.user
                )
            } catch (err) {
                console.error(err);

            }
        }
    }
})

slackEvents.start(3000)
    .then(() => {
        console.log('started server!');
    })