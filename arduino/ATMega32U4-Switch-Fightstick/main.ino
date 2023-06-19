#include "LUFAConfig.h"
#include <LUFA.h>
#include "Joystick.h"
#define BOUNCE_WITH_PROMPT_DETECTION
#include <Bounce2.h>

#define MILLIDEBOUNCE 1 //Debounce time in milliseconds
#define pinOBLED 21  //Onboard LED pin

bool buttonStartBefore;
bool buttonSelectBefore;
byte buttonStatus[15];

/*
  0x4000,
  0x8000,
  #define CAPTURE_MASK_ON 0x2000
  #define R3_MASK_ON 0x800
  #define L3_MASK_ON 0x400
*/
#define DPAD_UP_MASK_ON 0x00
#define DPAD_UPRIGHT_MASK_ON 0x01
#define DPAD_RIGHT_MASK_ON 0x02
#define DPAD_DOWNRIGHT_MASK_ON 0x03
#define DPAD_DOWN_MASK_ON 0x04
#define DPAD_DOWNLEFT_MASK_ON 0x05
#define DPAD_LEFT_MASK_ON 0x06
#define DPAD_UPLEFT_MASK_ON 0x07
#define DPAD_NOTHING_MASK_ON 0x08
#define A_MASK_ON 0x04
#define B_MASK_ON 0x02
#define X_MASK_ON 0x08
#define Y_MASK_ON 0x01
#define LB_MASK_ON 0x10
#define RB_MASK_ON 0x20
#define ZL_MASK_ON 0x40
#define ZR_MASK_ON 0x80
#define START_MASK_ON 0x200
#define SELECT_MASK_ON 0x100
#define HOME_MASK_ON 0x1000

typedef struct {
  int index;
  Bounce button;
  int pin;
} button_type;

#define BUTTONUP 0
#define BUTTONDOWN 1
#define BUTTONLEFT 2
#define BUTTONRIGHT 3
#define BUTTONA 4
#define BUTTONB 5
#define BUTTONX 6
#define BUTTONY 7
#define BUTTONLB 8
#define BUTTONRB 9
#define BUTTONLT 10
#define BUTTONRT 11
#define BUTTONSTART 12
#define BUTTONSELECT 13
#define BUTTONHOME 14

Bounce buttonUP = Bounce();
Bounce buttonDOWN = Bounce();
Bounce buttonLEFT = Bounce();
Bounce buttonRIGHT = Bounce();
Bounce buttonA = Bounce();
Bounce buttonB = Bounce();
Bounce buttonX = Bounce();
Bounce buttonY = Bounce();
Bounce buttonLB = Bounce();
Bounce buttonRB = Bounce();
Bounce buttonLT = Bounce();
Bounce buttonRT = Bounce();
Bounce buttonSTART = Bounce();
Bounce buttonSELECT = Bounce();
Bounce buttonHOME = Bounce();

typedef enum {
  REAL_ANALOG,
  ANALOG_MODE,
  DIGITAL
} State_t;
State_t state = ANALOG_MODE;

const int NB_BUTTONS = 8;
button_type buttons[NB_BUTTONS] = {
  {BUTTONUP, Bounce(), 9},
  {BUTTONDOWN, Bounce(), 10},
  {BUTTONLEFT, Bounce(), 11},
  {BUTTONRIGHT, Bounce(), 12},
  {BUTTONA, Bounce(), 3},
  {BUTTONB, Bounce(), 4},
  {BUTTONLB, Bounce(), 5},
  {BUTTONSTART, Bounce(), 6},
};
              
void setupPins() {
  for (int i = 0; i < NB_BUTTONS; i++) {
    buttons[i].button.attach(buttons[i].pin, INPUT_PULLUP);
    buttons[i].button.interval(MILLIDEBOUNCE);
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }

  pinMode(pinOBLED, OUTPUT);
  //Set the LED to low to make sure it is off
  digitalWrite(pinOBLED, HIGH);
}
void setup() {
  buttonStartBefore = false;
  buttonSelectBefore = false;
  setupPins();
  SetupHardware();
  GlobalInterruptEnable();
}


void loop() {
  buttonRead();
  processButtons();
  HID_Task();
  // We also need to run the main USB management task.
  USB_USBTask();
}

void buttonRead()
{
  for (int i = 0; i < NB_BUTTONS; i++) {
    if (buttons[i].button.update()) {
      buttonStatus[ buttons[i].index] = buttons[i].button.fell();
    }
  }
}


void processDPAD() {
  ReportData.LX = 128;
  ReportData.LY = 128;
  ReportData.RX = 128;
  ReportData.RY = 128;

  if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.HAT = DPAD_UPRIGHT_MASK_ON;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.HAT = DPAD_DOWNRIGHT_MASK_ON;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.HAT = DPAD_DOWNLEFT_MASK_ON;
  }
  else if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.HAT = DPAD_UPLEFT_MASK_ON;
  }
  else if (buttonStatus[BUTTONUP]) {
    ReportData.HAT = DPAD_UP_MASK_ON;
  }
  else if (buttonStatus[BUTTONDOWN]) {
    ReportData.HAT = DPAD_DOWN_MASK_ON;
  }
  else if (buttonStatus[BUTTONLEFT]) {
    ReportData.HAT = DPAD_LEFT_MASK_ON;
  }
  else if (buttonStatus[BUTTONRIGHT]) {
    ReportData.HAT = DPAD_RIGHT_MASK_ON;
  }
  else {
    ReportData.HAT = DPAD_NOTHING_MASK_ON;
  }
}
void processRealANALOG() {
  ReportData.HAT = DPAD_NOTHING_MASK_ON;
  ReportData.LX = analogRead(A0); // 255 - map(analogRead(A0), 0, 1023, 0, 255);
  ReportData.LY = analogRead(A1); //map(analogRead(A1), 0, 1023, 0, 255);

}
void processLANALOG() {
  ReportData.HAT = DPAD_NOTHING_MASK_ON;
  ReportData.RX = 128;
  ReportData.RY = 128;

  if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.LY = 0;
    ReportData.LX = 255;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.LY = 255;
    ReportData.LX = 255;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.LY = 255;
    ReportData.LX = 0;
  }
  else if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.LY = 0;
    ReportData.LX = 0;
  }
  else if (buttonStatus[BUTTONUP]) {
    ReportData.LY = 0;
    ReportData.LX = 128;
  }
  else if (buttonStatus[BUTTONDOWN]) {
    ReportData.LY = 255;
    ReportData.LX = 128;
  }
  else if (buttonStatus[BUTTONLEFT]) {
    ReportData.LX = 0;
    ReportData.LY = 128;
  }
  else if (buttonStatus[BUTTONRIGHT]) {
    ReportData.LX = 255;
    ReportData.LY = 128;
  }
  else {
    ReportData.LX = 128;
    ReportData.LY = 128;
  }
}
void processLANALOGSmash() {
  ReportData.HAT = DPAD_NOTHING_MASK_ON;
  ReportData.RX = 128;
  ReportData.RY = 128;

  if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.LY = 64;
    ReportData.LX = 192;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.LY = 192;
    ReportData.LX = 192;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.LY = 192;
    ReportData.LX = 64;
  }
  else if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.LY = 64;
    ReportData.LX = 64;
  }
  else if (buttonStatus[BUTTONUP]) {
    ReportData.LY = 64;
    ReportData.LX = 128;
  }
  else if (buttonStatus[BUTTONDOWN]) {
    ReportData.LY = 192;
    ReportData.LX = 128;
  }
  else if (buttonStatus[BUTTONLEFT]) {
    ReportData.LX = 64;
    ReportData.LY = 128;
  }
  else if (buttonStatus[BUTTONRIGHT]) {
    ReportData.LX = 192;
    ReportData.LY = 128;
  }
  else {
    ReportData.LX = 128;
    ReportData.LY = 128;
  }
}
void processRANALOG() {
  ReportData.HAT = 0x08;
  ReportData.LX = 128;
  ReportData.LY = 128;

  if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.RY = 0;
    ReportData.RX = 255;
  }
  else if ((buttonStatus[BUTTONUP]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.RY = 0;
    ReportData.RX = 0;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONRIGHT])) {
    ReportData.RY = 255;
    ReportData.RX = 255;
  }
  else if ((buttonStatus[BUTTONDOWN]) && (buttonStatus[BUTTONLEFT])) {
    ReportData.RY = 255;
    ReportData.RX = 0;
  }
  else if (buttonStatus[BUTTONUP]) {
    ReportData.RY = 0;
    ReportData.RX = 128;
  }
  else if (buttonStatus[BUTTONDOWN]) {
    ReportData.RY = 255;
    ReportData.RX = 128;
  }
  else if (buttonStatus[BUTTONLEFT]) {
    ReportData.RX = 0;
    ReportData.RY = 128;
  }
  else if (buttonStatus[BUTTONRIGHT]) {
    ReportData.RX = 255;
    ReportData.RY = 128;
  }
  else {
    ReportData.RX = 128;
    ReportData.RY = 128;
  }

}
void processButtons() {
  switch (state)
  {
    case DIGITAL:
      processDPAD();
      buttonProcessing();
      break;

    case ANALOG_MODE:
      processLANALOG();
      buttonProcessing();
      break;

    case REAL_ANALOG:
      processRealANALOG();
      buttonProcessing();

      break;
  }
}
void buttonProcessing() {
  if (buttonStatus[BUTTONA]) {
    ReportData.Button |= A_MASK_ON;
  }
  if (buttonStatus[BUTTONB]) {
    ReportData.Button |= B_MASK_ON;
  }
  if (buttonStatus[BUTTONX]) {
    ReportData.Button |= X_MASK_ON;
  }
  if (buttonStatus[BUTTONY]) {
    ReportData.Button |= Y_MASK_ON;
  }
  if (buttonStatus[BUTTONLB]) {
    ReportData.Button |= LB_MASK_ON;
  }
  if (buttonStatus[BUTTONRB]) {
    ReportData.Button |= RB_MASK_ON;
  }
  if (buttonStatus[BUTTONLT]) {
    ReportData.Button |= ZL_MASK_ON;
  }
  if (buttonStatus[BUTTONRT]) {
    ReportData.Button |= ZR_MASK_ON;
  }
  if (buttonStatus[BUTTONSTART]) {
    ReportData.Button |= START_MASK_ON;
  }
  if (buttonStatus[BUTTONSELECT]) {
    ReportData.Button |= SELECT_MASK_ON;
  }
  if (buttonStatus[BUTTONHOME]){ReportData.Button |= HOME_MASK_ON;}
}
