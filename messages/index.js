/*-----------------------------------------------------------------------------
This template demonstrates how to use Waterfalls to collect input from a user using a sequence of steps.
For a complete walkthrough of creating this type of bot see the article at
https://docs.botframework.com/en-us/node/builder/chat/dialogs/#waterfall
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var mongoClient = require("mongodb").MongoClient;
mongoClient.connect("mongodb://orderdb:koWjjeHkNvPFqV7hjCzeZlEyj8EkGdkH6TuKWIbs5JYeMaMwAO5IP4PVS4WolMq2r6b6qu2kjIPQMc6auct5dQ==@orderdb.documents.azure.com:10250/?ssl=true", function (err, db) {
  db.close();
});

var userStore = [];
var bot = new builder.UniversalBot(connector, function (session) {
    // store user's address
    var address = session.message.address;
    userStore.push(address);
    var addressStr = JSON.stringify(session.message.address);
    //var addressData = JSON.parse(address);    
    // end current dialog
    session.endDialog('Thank you for your order!');
});

// Every 5 seconds, check for new registered users and start a new dialog
setInterval(function () {
    var newAddresses = userStore.splice(0);
    newAddresses.forEach(function (address) {

        console.log('Starting survey for address:', address);

        // new conversation address, copy without conversationId
        var newConversationAddress = Object.assign({}, address);
        delete newConversationAddress.conversation;
        //var addressData = JSON.parse(address);
        // start survey dialog
        bot.beginDialog(newConversationAddress, 'survey', null, function (err) {
            if (err) {
                // error ocurred while starting new conversation. Channel not supported?
                bot.send(new builder.Message()
                    .text('This channel does not support this operation: ' + err.message)
                    .address(address));
            }
        });

    });
}, 5000);

bot.dialog('survey', [
    function (session) {
        builder.Prompts.choice(session, 'Hello '+session.message.address.user.name+', Have you started using your ...?', ['Yes', 'No']);
    },

    function (session, results) {
        //session.userData.name = results.response;
        builder.Prompts.choice(session, 'How would you rate your purchase experience with ...? ', ['Poor.', 'Good.', 'Great!']);
    },
    function (session, results) {
        session.userData.language = results.response.entity;
        session.endDialog('Thanks for letting us know your purchase experience with ... ' +
            ' was ' + session.userData.language);
    }
]);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
