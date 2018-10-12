//TJBot libs
var TJBot = require("tjbotczlib");
var conf = require("./configuration/config"); //tjConfig & local czech enhancements
var confCred = require("./configuration/credentials"); //credentials only
var fs = require("fs"); //filesystem

//Pigpio library for LED (simple version)
var gpio = require("pigpio").Gpio;
const _basic_colors = ["red", "green", "blue", "yellow", "magenta", "cyan", "white"];

var pinR = new gpio(conf.ledpins.R, { mode: gpio.OUTPUT });
var pinG = new gpio(conf.ledpins.G, { mode: gpio.OUTPUT });
var pinB = new gpio(conf.ledpins.B, { mode: gpio.OUTPUT });
var _RGBLed = { pinR, pinG, pinB };

//TJBot - Watson services
//---------------------------------------------------------------------
var credentials = confCred.credentials;
var hardware = ['microphone', 'speaker', 'servo', 'camera', 'rgb_led'];
var tjConfig = conf.tjConfig;
var _paths = conf.paths;

var tj = new TJBot(hardware, tjConfig, credentials);

//LCD library
var LCD = require('lcdi2c');
var lcd = new LCD( 1, 0x3F, 16, 2 ); //(bus, address, columns, rows)

//Context object
var contextBackup; // last conversation context backup
var ctx = {}; // our internal context object

//Rock-paper-scissors variables
var tjChoice;
var playerChoice;
var lcdText = "My choice is: "

//---------------------------------------------------------------------
// Functions
//---------------------------------------------------------------------

//VISUAL RECOGNITION
//---------------------------------------------------------------------

/**
 * TAKE A FOTO
 */
function take_a_photo() {
  return new Promise(function (resolve, reject) {
    tj.takePhoto(_paths.picture.orig).then(function (data) {
      if (!fs.existsSync(_paths.picture.orig)) {
        reject("expected picture.jpg to have been created");
      } else {
        resolve("picture taken successfully");
      }
    });
    tj.play(_paths.music.take_a_picture);
  });
}

/**
 * CLASSIFY PHOTO
 */
function classify_photo() {
  tj.recognizeObjectsInPhoto(_paths.picture.orig).then(function (objects) {
    console.log(JSON.stringify(objects, null, 2));

    photoClassificationToText(objects, function (text) {
      tj.speak(text);
    });
  });
}

/**
 * helper for classify_photo() which returns only objects in picture with score > 0.5 and max 5 classes
 * @param objects - list of objects
 */
function photoClassificationToText(objects, callback) {
  var text = "";
  var numOfClasses = 0;
  var maxNumOfClasses = 5;
  objects.sort(function (a, b) { return b.score - a.score; });
  for (var j = 0; j < objects.length; j++) {
    if (objects[j].score >= 0.5) {
      if (numOfClasses) text = text + ',';
      text = text + " " + objects[j].class;
      numOfClasses++;
      if (numOfClasses >= maxNumOfClasses) break;
    }

  }
  if (text != "") {
    text = "I think I can see: " + text + ".";
  } else {
    text = "I can't recognize what is in the picture.";
  }
  callback(text);
}

//CONVERSATION
//---------------------------------------------------------------------

/**
 * LISTEN
 */
function listen() {
  tj.speak("Hello, my name is " + tj.configuration.robot.name + ". Let's play Rock-paper-scissors! Its easy. Choose your object and put it in front of my little eye, so I can see it. Are you ready?.").then( () =>
  {tjChoice = getTjChoice();
   lcd_displayDoubleLine(lcdText, tjChoice);
  });

  tj.listen(function (msg) {
    // check to see if they are talking to TJBot
    if (msg.indexOf(tj.configuration.robot.name) > -1) { //robot's name is in the text
      // remove our name from the message
      var msgNoName = msg.toLowerCase().replace(tj.configuration.robot.name.toLowerCase(), "");

      processConversation(msgNoName, function (response) {
        //read response text from the service
        if (response.description) {
          tj.speak(response.description).then(function () {
            if (response.object.context.hasOwnProperty('action')) {
              var cmdType = response.object.context.action.cmdType;
              var cmdPayload;
              if (response.object.context.action.hasOwnProperty('cmdPayload')) {
                cmdPayload = response.object.context.action.cmdPayload;
              }
              processAction(cmdType, cmdPayload);
            }
          });
        }
      });
    }
  });
}

/**
 * Stop listening
 */
function stopListening() {
  tj.stopListening();

  var msg = "Listening was stopped.";
  tj.speak(msg);
  console.log(msg);
}

/**
 * PROCESS CONVERSATION
 * @param inTextMessage - text
 */
function processConversation(inTextMessage, callback) {
  if(contextBackup == null) contextBackup = ctx;
  if(contextBackup.hasOwnProperty('action')) delete contextBackup.action;
  if(contextBackup.hasOwnProperty('yes_photo')) delete contextBackup.yes_photo;
  // Object.assign(contextBackup, ctx);

  // send to the conversation service
  tj.converse(confCred.conversationWorkspaceId, inTextMessage, contextBackup, function (response) {
    console.log(JSON.stringify(response, null, 2));
    contextBackup = response.object.context;
    callback(response);
  });
}


//PROCESS ACTIONS
//---------------------------------------------------------------------
function processAction(cmd, payload) {
  switch (cmd) {
    case "tjbot_reset":
      resetTJBot();
      break;
    case "take_a_photo":
      take_a_photo().then(function () {
        tj.recognizeObjectsInPhoto(_paths.picture.orig).then(function (objects) {
          var recognizedClasses = JSON.stringify(objects, null, 2);
          console.log(recognizedClasses);
          defineObject(recognizedClasses);
        });
      });
      break;
    case "classify_photo":
      classify_photo();
      break;
    case "read_text":
      //read_text();
      tj.speak("Unfortunately, the text recognition is not supported. You can classify objects now.");
      break;
    case "listen":
      listen();
      break;
    case "stop_listening":
      stopListening();
      break;
    case "led_turn_on":
      led_turn_on_all();
      break;
    case "led_turn_off":
      led_turn_off_all();
      break;
    case "led_change_color":
      led_change_color(payload.color);
      break;
    case "wave_arm":
      wave_arm(payload.position);
      break;
    case "play_game":
      playGame();
      break;
    case "new_game":
      newGame();
      break;
    default:
      console.log("Command not supported... " + cmd);
  }
}


//LED
//---------------------------------------------------------------------

//Turns off all the LED colors
//---------------------------------------------------------------------
function led_turn_off_all() {
  tj.turnOffRGBLed();
}

//Turns on all the LED on random color
//---------------------------------------------------------------------
function led_turn_on_all() {
  tj.turnOnRGBLed(function(ret_color){
    if(ret_color){
      console.log("Color is: " + ret_color);
    } else{
      console.log("LED did not turn on.");
    }
  });
}

//Changes the color of th RGB diode
//---------------------------------------------------------------------
function led_change_color(color){
  tj.changeColorRGBLed(color, function(ret_color){
    if(ret_color) {
      console.log("Color is: " + ret_color);
    } else {
      console.log("Color did not set.");
    }
  });
}

//ARM
//---------------------------------------------------------------------
function wave_arm(position) {
  switch (position) {
    case "back":
      tj.armBack();
      break;
    case "raised":
      tj.raiseArm();
      break;
    case "forward":
      tj.lowerArm();
      break;
    case "wave":
      tj.wave();
      break;
    default:
      tj.speak("I'm not able to set my arm into this position.");
  }
}


//RESET TJBOT
//---------------------------------------------------------------------
function resetTJBot() {
  tj.raiseArm();
  led_turn_off_all();
  lcd_display("LCD ON");
  listen()
}
//RESET TJBOT - TIE STATUS
//---------------------------------------------------------------------
function newGame() {
  tj.speak("Choose your object. Are you ready?");
  tj.raiseArm();
  led_turn_off_all();
  lcd_display("LCD ON");
  tjChoice = getTjChoice();
  lcd_displayDoubleLine(lcdText, tjChoice);
}


//LCD Display Sigle Line Text
//---------------------------------------------------------------------
function lcd_display(lcdtext){
lcd.clear();
lcd.println(lcdtext);
}

//LCD Display Double Line Text
//---------------------------------------------------------------------
function lcd_displayDoubleLine(lcdtext1, lcdtext2){
lcd.clear();
lcd.setCursor(0, 0);
lcd.println(lcdtext1);
lcd.setCursor(0, 1);
lcd.println(lcdtext2);
}

//GET RANDOM NUMBER
//---------------------------------------------------------------------
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
};

//GET TJ CHIOCE
//---------------------------------------------------------------------
function getTjChoice(){
  const gameOptions = ["rock", "paper", "scissors"];
  var tjChoice = gameOptions[getRandomInt(3)];
  lcd_display(`My choice is: ${tjChoice}`);

  return tjChoice;
}

//LED LIGHT SHOW
//---------------------------------------------------------------------
function ledShow() {
  const colors = ['green', 'blue', 'magenta', 'white', 'yellow', 'cyan', 'green', 'blue', 'magenta', 'white', 'yellow', 'cyan', 'green','blue', 'magenta', 'white', 'yellow', 'cyan', 'green',
  'blue', 'magenta', 'white', 'yellow', 'cyan']
      colors.forEach( function (color, index) {
          setTimeout( function() {
              led_change_color(color);
          }, 200 * index);
      })
};

function defineObject(text){
  if (text.includes('rock')) {
    tj.speak("I think I can see a rock. Is this right?")
  }
  else if (text.includes('paper')) {
    tj.speak("I think I can see a paper. Is this right?")
  }
  else if (text.includes('scissors')) {
    tj.speak("I think I can see a pair of scissors. Is this right?")
  }
  else {
    if(contextBackup.hasOwnProperty('play')) delete contextBackup.play;
    tj.speak("Ugh, sorry, I am not sure what is on a picture. Let's try again.").then(() => {newGame()});

  }

}

//GET PLAYER CHOICE
//---------------------------------------------------------------------
function getPlayerChoice(text){
  if (text.includes('rock')) {
    playerChoice = "rock";
  }
  else if (text.includes('paper')) {
    playerChoice = "paper";
  }
  else if (text.includes("scissors")) {
    playerChoice = "scissors";
  }
  return playerChoice
}

//EVALUETS THE GAME
//---------------------------------------------------------------------
function gameStatus(tjChoice, playerChoice) {

  if (tjChoice == playerChoice) {
    tj.speak("It's a tie! Let's try again!").then(() =>  {
      newGame();
    });
  }
  else if ((tjChoice == "paper" && playerChoice == "rock") || (tjChoice == "rock" && playerChoice == "scissors") || (tjChoice == "scissors" && playerChoice == "paper"))  {
    tj.play(_paths.music.lose);
    led_change_color('red')
    tj.speak(`Oops! Today is not your lucky day. I have choosen ${tjChoice} and you chosed ${playerChoice}, so I win. Thank you for the game.`).then(function() {
        tj.wave()
    });
  }
  else {
    tj.play(_paths.music.win);
    ledShow();
    tj.speak(`Yahoo! Today is your lucky day! I have choosen ${tjChoice} and you chosed ${playerChoice}. You win! Thank you for the game!`).then(function() {
        tj.wave()
    });
  }
}

//PLAY ROCK PAPER SCISSORS
//---------------------------------------------------------------------
function playGame() {
  tj.recognizeObjectsInPhoto(_paths.picture.orig).then(function (objects) {
    var recognizedClasses = JSON.stringify(objects, null, 2);
    recognizedClasses = objects.sort(function (a, b) { return b.score - a.score; });
    sortedClasses = JSON.stringify(recognizedClasses, null, 2);
    playerChoice = getPlayerChoice(sortedClasses);
    console.log(`My choice is ${tjChoice} and your choice is ${playerChoice}`);
    gameStatus(tjChoice, playerChoice);
  });
}

//CALL INIT
//---------------------------------------------------------------------
resetTJBot();
