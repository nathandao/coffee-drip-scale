#include "BluetoothSerial.h"

#include "HX711.h"

//This value is obtained using the SparkFun_HX711_Calibration sketch
#define CALIBRATION_FACTOR 1965

#define DOUT  25
#define CLK  26

HX711 scale;
BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200);
  delay(1);
  SerialBT.begin("CoffeeScale"); //Bluetooth device name
  delay(1);
  Serial.println("The device started, now you can pair it with bluetooth!");

  scale.begin(DOUT, CLK);
  delay(1);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
}

void loop() {
  char r[32];
  sprintf(r, "%f", scale.get_units());
  SerialBT.println(r);

  String dd = "";
  char d = SerialBT.read();
  dd.concat(d);
  // Tare when receiving '1'
  if (dd == "1") {
    // Serial.print("RECEIVED");
    // Serial.println(dd);
    scale.tare();
  }
  delay(10);
}
