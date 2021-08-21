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

//Incoming call is served by this GET request
//Twilio malkes this call to our relay server
app.get('/', (req, res)=>{
    //All requests after the first call, where the request to Lucy
    //is user's uttered words transcribed into text
    if(callCount != 0){
        context.input.text = transcibedText;
        raw = JSON.stringify(context);
    }
    else{
        //Initial text sent to Lucy when user makes the call
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
            //We save Lucy's latest response in context,
            //which would be used in our subsequent calls.
            context = response.data;
            console.log(response.data.output);
            //TWiML Response
            const apiToVoiceResponse = new VoiceResponse();
            //Instructing TWiML to say Lucy's response
            apiToVoiceResponse.say(response.data.output.text[0]);
            //Go to /getUserResponse after say verb
            apiToVoiceResponse.redirect('/getUserResponse');
            //All TWiML verbs are sent as an XML to Twilio for execution
            res.send(apiToVoiceResponse.toString());
        });
})

//Redicrect from initial call to gather user's speech
app.post('/getUserResponse', (req, res)=>{
    const response = new VoiceResponse();
    response.gather({
        input: 'speech',
        speechTimeout: 3,
        // finishOnkey: '#',
        speechModel: 'phone_call',
        enhanced: 'true',
        //Redirect to /transcribed once speech to text conversion is done
        action: '/transcribed'
    })
    res.send(response.toString());
})

//Update global variables transcibedText with the speeech result (transcribed text)
//Transcribed text is what is sent into context in the main GET request
//i.e. User's speech --> Gather --> Transcribe --> Update Context
app.post('/transcribed', (req, res)=>{
    transcibedText = req.body.SpeechResult;
    console.log(transcibedText);
    const response = new VoiceResponse();
    //callSid is obtained from the current ongoing call's request 
    const callSid = req.body.CallSid;
    //Modify and update live call to redirect to GET with latest context
    //updated in line 81
    client.calls(callSid)
      .update({method: 'GET', url: env.callUpdateURL})
      .then(call => console.log(call.to));
})

app.listen(3000, ()=>{
    console.log('Listening at 3000, please use ngrok to expose local server.');
})