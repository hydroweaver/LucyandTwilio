const express = require('express')
const twilio = require('twilio')
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const env = require('./environment')
const axios = require('axios').default;
const client = twilio(env.accountSid, env.authToken);

app = express()
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

var callCount = 0;
var context;
var transcibedText;
var raw;

var requestOptions = {
    headers: {
        'Authorization': env.lucyauth,
        'Content-Type': "application/json"
    },
  };

app.get('/', (req, res)=>{
    if(callCount != 0){
        context.input.text = transcibedText;
        raw = JSON.stringify(context);
    }
    else{
        raw = JSON.stringify({
            "input": {
              "text": "hi"
            }
        });
    }
    console.log(raw);
        axios.post(env.lucyEndpoint, raw, requestOptions)
        .then(response=>{
            callCount += 1;
            context = response.data;
            console.log(response.data.output);
            const apiToVoiceResponse = new VoiceResponse();
            apiToVoiceResponse.say(response.data.output.text[0]);
            apiToVoiceResponse.redirect('/getUserResponse');
            res.send(apiToVoiceResponse.toString());
        });
})

app.post('/getUserResponse', (req, res)=>{
    const response = new VoiceResponse();
    response.gather({
        input: 'speech',
        speechTimeout: 3,
        // finishOnkey: '#',
        speechModel: 'phone_call',
        enhanced: 'true',
        action: '/transcribed'
    })
    res.send(response.toString());
})

app.post('/transcribed', (req, res)=>{
    transcibedText = req.body.SpeechResult;
    console.log(transcibedText);
    const response = new VoiceResponse();
    const callSid = req.body.CallSid;
    client.calls(callSid)
      .update({method: 'GET', url: env.callUpdateURL})
      .then(call => console.log(call.to));
})

app.listen(3000, ()=>{
    console.log('Listening at 3000, please use ngrok to expose local server.');
})