/*
 * Gyst for Alexa Fact Skill
 * Copyright 2020 - 2021 Gyst Technologies, Inc. or its affiliates. All Rights Reserved.
 * Gyst Technology is patented and patent pending.
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at http://www.apache.org/licenses/LICENSE-2.0
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// set up dependencies
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');

// start of Gyst specific code
let AWS = require('aws-sdk');
var lambda = new AWS.Lambda({region:'us-east-1'});
global.gystRecommendation = 102;    // Gyst API return status (the SSML prosody rate in most cases), defaults to 100, or normal 
const gystRec1 = '<prosody rate = "' + global.gystRecommendation + '%">Gyst active at ' + global.gystRecommendation + ' percent. ';
const gystRec2 = '</prosody>';
// end of Gyst specific code
    
// core functionality for fact skill
const GetNewFactHandler = 
{
  canHandle(handlerInput) 
  {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'GetNewFactIntent');
  },
  handle(handlerInput) 
  {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    // gets a random fact by assigning an array to the variable
    // the random item from the array will be selected by the i18next library
    // the i18next library is set up in the Request Interceptor
    const randomFact = requestAttributes.t('FACTS');

    // start of Gyst specific code
    var params = 
    {
      FunctionName: 'GystAPIAlexa', // the lambda function we are going to invoke
      InvocationType: 'RequestResponse',    // sync invocation - event is async
      LogType: 'Tail',
      Payload: '{ "portNumber" : "1", "nodeNumber" : "1", "nodeResponse" : "0", "nodeModality" : "1" }'
    };
    
    lambda.invoke(params, function(err, data) 
    {
      if (err) 
      {
        console.log(err, err.stack);
      } 
      else 
      {
        console.log(data);
        global.gystRecommendation = data.Payload;
      }
    });
    // construct the Gyst optimized text string for a given fact
    const speakOutput = gystRec1 + requestAttributes.t('GET_FACT_MESSAGE') + randomFact + gystRec2;
    // end of Gyst specific code

    return handlerInput.responseBuilder
      .speak(speakOutput)
      // uncomment the next line to keep the session open so you can ask for another fact without first re-opening the skill
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .withSimpleCard(requestAttributes.t('SKILL_NAME'), randomFact)
      .getResponse();
  },
};

const HelpHandler = 
{
  canHandle(handlerInput) 
  {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) 
  {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('HELP_MESSAGE'))
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
};

const FallbackHandler = 
{
  // The FallbackIntent can only be sent in those locales which support it,
  // so this handler will always be skipped in locales where it is not supported.
  canHandle(handlerInput) 
  {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) 
  {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('FALLBACK_MESSAGE'))
      .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
      .getResponse();
  },
};

const ExitHandler = 
{
  canHandle(handlerInput) 
  {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) 
  {
    // start of Gyst specific code
    var params = 
    {
      FunctionName: 'GystAPI-Alexa', // the lambda function we are going to invoke
      InvocationType: 'RequestResponse',    // sync invocation - event is async
      LogType: 'Tail',
      Payload: '{ "portNumber" : "1", "nodeNumber" : "1002", "nodeResponse" : "0", "nodeModality" : "1" }'
    };
    
    lambda.invoke(params, function(err, data) 
    {
      if (err) 
      {
        console.log(err, err.stack);
      } 
      else 
      {
        console.log(data);
        global.gystRecommendation = data.Payload;
      }
    });
    // end of Gyst specific code
    
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('STOP_MESSAGE'))
      .getResponse();
  },
};

const SessionEndedRequestHandler = 
{
  canHandle(handlerInput) 
  {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) 
  {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = 
{
  canHandle() 
  {
    return true;
  },
  handle(handlerInput, error) 
  {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('ERROR_MESSAGE'))
      .reprompt(requestAttributes.t('ERROR_MESSAGE'))
      .getResponse();
  },
};

const LocalizationInterceptor = 
{
  process(handlerInput) 
  {
    // Gets the locale from the request and initializes i18next.
    const localizationClient = i18n.init(
      {
      lng: handlerInput.requestEnvelope.request.locale,
      resources: languageStrings,
      returnObjects: true
      });
    // Creates a localize function to support arguments.
    localizationClient.localize = function localize() 
    {
      // gets arguments through and passes them to
      // i18next using sprintf to replace string placeholders
      // with arguments.
      const args = arguments;
      const value = i18n.t(...args);
      // If an array is used then a random value is selected
      if (Array.isArray(value)) 
      {
        return value[Math.floor(Math.random() * value.length)];
      }
      return value;
    };
    // this gets the request attributes and save the localize function inside
    // it to be used in a handler by calling requestAttributes.t(STRING_ID, [args...])
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) 
    {
      return localizationClient.localize(...args);
    }
  }
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetNewFactHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('sample/basic-fact/v2')
  .lambda();

const enData = 
{
  translation: 
  {
    SKILL_NAME: 'Gyst Fun Facts',
    GET_FACT_MESSAGE: 'Here\'s a Gyst Fun Fact: ',
    HELP_MESSAGE: 'You can say tell me a space fact, or, you can say exit... What can I help you with?',
    HELP_REPROMPT: 'What can I help you with?',
    FALLBACK_MESSAGE: 'The Space Facts skill can\'t help you with that.  It can help you discover facts about space if you say tell me a space fact. What can I help you with?',
    FALLBACK_REPROMPT: 'What can I help you with?',
    ERROR_MESSAGE: 'Sorry, an error occurred.',
    STOP_MESSAGE: 'Thanks for checking out the Gyst Fun Facts skill. Goodbye!',
    FACTS:
      [
        'A year on Mercury is just 88 days long.',
        'Despite being farther from the Sun, Venus experiences higher temperatures than Mercury.',
        'On Mars, the Sun appears about half the size as it does on Earth.',
        'Jupiter has the shortest day of all of the planets.',
        'The Sun is an almost perfect sphere.',
      ],
  },
};

// constructs i18n and l10n data structure
const languageStrings = 
{
  'en': enData,
};
