# TJBotCZ R-P-S Game

TJBot program playing Rock-Paper-Scissors in a fun way. This program is coded in Node.js for TJBotCZ and is based on _TJBot CZ - Lite_ program.On top of the TJBotCZ kit you will need:

* real rock, sheet of paper, real scissors
* [LCD Display](https://arduino-shop.cz/arduino/1570-iic-i2c-display-lcd-1602-16x2-znaku-lcd-modul-modry-1487765909.html) so that you can see TJBot's choice

### How it works?

_Note: TJBot's name is Michael, unless you change it in config.js file. So when you speek to TJBot, use "Michael" in your sentence. Only then will he process the sentence._

1. TJBot asks you if you want to play the game.
2. He chooses Rock, Paper or Scissors option and shows it on the display placed at the back of his legs (see pictures below). So if you have a friend with you, he can check and see that TJBot is not cheating.
3. Then you play by showing him real rock, paper or scissors.
4. TJBot uses object detection to classify the object you have shown him, asks for confirmation if his classification is correct and then announces the winner of the game.

![rps-teaser](https://raw.githubusercontent.com/tjbotcz/manuals/master/images/rps-teaser.jpg)

TJBot guides you through the game step by step, the conversation is predefined, but can be easily adjusted to your own needs.
To create your own conversation dialogs we recommend to visit this tutorial:

[How to build a chatbot](https://cognitiveclass.ai/courses/how-to-build-a-chatbot/)

### Hardware setup

Connect the LCD to the GPIO pins as follows:
* VCC to 5V (physical pin 2 or 4)
* GND to ground (physical pin 6)
* SDA to GPIO 02 (physical pin 3)
* SCL to GPIO 03 (physical pin 5)

![RPI Pins](https://raw.githubusercontent.com/tjbotcz/manuals/master/images/rpi_pins.png)


![Display position](https://raw.githubusercontent.com/tjbotcz/manuals/master/images/rps-display.jpg)
