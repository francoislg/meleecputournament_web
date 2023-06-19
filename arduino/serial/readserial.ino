int currentPin = 0;
bool readNumericValue = false;
int currentNumericValue = 0;

void processSerial(char ch) {
    if(ch >= '0' && ch <= '9') // is this an ascii digit between 0 and 9?
    {
      if (readNumericValue) {
        currentNumericValue = (currentNumericValue * 10) + (ch - '0');
      } else {
        currentPin = (currentPin * 10) + (ch - '0');
      }
    }
    else if (ch == '+')  // comma is our separator, so move on to the next field
    {
      buttonStatus[currentPin] = true;
    }
    else if (ch == '-')  // comma is our separator, so move on to the next field
    {
      buttonStatus[currentPin] = false;
    }
    else if (ch == ':')  // comma is our separator, so move on to the next field
    {
      readNumericValue = true;
    }
    else if (ch == ',')  // comma is our separator, so move on to the next field
    {
      currentPin = 0;
    }
    else if (ch == 'c') {
      clear();
    }
    else if (ch == '\n') {
      if (readNumericValue) {
        processNumericField();
      }
      resetFields();
    }
}

void resetFields() {
  currentPin = 0;
  currentNumericValue = 0;
  readNumericValue = false;
}

void clear() {
  for (int i = 0; i < NB_BUTTONS; i++) {
    buttonStatus[i] = false;
  }
  for (int i = 0; i < NB_ANALOG; i++) {
    analogsStatus[i] = 128;
  }
}

void processNumericField() {
  analogsStatus[currentPin] = currentNumericValue;
}
