#define PRINT 0

#define NB_BUTTONS 19
bool buttonStatus[NB_BUTTONS];
#define NB_ANALOG 0
int analogsStatus[NB_ANALOG];

const int pins[NB_BUTTONS] = {
  3, 4, 5, 6, 7, 8, 14, 15, 16, 17,
  9, 10, 11, 12, 18, 19, 20, 21
};

void setup()
{
  Serial.begin(1000000);
  resetFields();
  for (int i = 0; i < NB_BUTTONS; i++) {
    pinMode(pins[i], OUTPUT);
    buttonStatus[i] = false;
  }

  #if (NB_ANALOG >= 1)
  pinMode(A0, OUTPUT);
  #endif
  #if (NB_ANALOG >= 2)
 pinMode(A1, OUTPUT);
  #endif
  #if (NB_ANALOG >= 3)
  pinMode(A2, OUTPUT);
  #endif
  #if (NB_ANALOG >= 4)
  pinMode(A3, OUTPUT);
  #endif
  for (int i = 0; i < NB_ANALOG; i++) {
    analogsStatus[i] = 128;
  }
}

void loop()
{
  while (Serial.available() > 0) {
    processSerial(Serial.read());
#if PRINT
    printFields();
#endif
  }

  for (int i = 0; i < NB_BUTTONS; i++) {
    digitalWrite(pins[i], buttonStatus[i] ? LOW : HIGH);
  }
  #if (NB_ANALOG >= 1)
  analogWrite(A0, analogsStatus[0]);
  #endif
  #if (NB_ANALOG >= 2)
  analogWrite(A1, analogsStatus[1]);
  #endif
  #if (NB_ANALOG >= 3)
  analogWrite(A2, analogsStatus[2]);
  #endif
  #if (NB_ANALOG >= 4)
  analogWrite(A3, analogsStatus[3]);
  #endif
}

void printFields() {
  for (int i = 0; i < NB_BUTTONS; i++) {
    Serial.print(pins[i]);
    Serial.print(":");
    Serial.print(buttonStatus[i]);
    Serial.print(" | ");
  }
  Serial.print(" Analog: ");
  for (int i = 0; i < NB_ANALOG; i++) {
    Serial.print(analogsStatus[i]);
    Serial.print(" | ");
  }
  Serial.println();
}
