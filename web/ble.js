const ws = require('nodejs-websocket');
const opn = require('opn');

const btSerial = new (require('bluetooth-serial-port').BluetoothSerialPort)();

// The bluetooth serial device name
const DEVICE_NAME = 'CoffeeScale';

// The websocket server
const wsServer = ws.createServer((conn) => {
  conn.on('text', (e) => {
    // Tare whenever receiving a message.
    console.log('tare');

    // Write "1" to the Bluetooth Serial connection
    btSerial.write(Buffer.from('1'), (err) => {
      if (err) {
        console.log(err);
      }
    });
  });
});

const handleCoffeeScaleData = (address, name) => {
  btSerial.findSerialPortChannel(
    address,
    (channel) => {
      btSerial.connect(
        address,
        channel,
        () => {
          console.log(
            `Connected to ${name}, address: ${address}, channel: ${channel}`
          );

          btSerial.on('data', (buffer) => {
            const reading = buffer.toString().trim();
            if (reading !== '') {
              console.log(reading);
              // Send reading to clients
              wsServer.connections.forEach((conn) => conn.sendText(reading));
            }
          });
        },
        function() {
          console.log('Unable to connect. Trying again...');
          btSerial.inquire();
        }
      );
      btSerial.close();
    },
    function() {
      console.log('No device found :( Try restarting the app and the ESP32');
    }
  );
};

// Add event listener when receiving data from the CoffeeScale device
btSerial.on('found', (address, name) => {
  // Only subscribe to the 'CoffeeScale' device
  if (name === DEVICE_NAME) {
    console.log(`Found ${DEVICE_NAME}!`);
    opn('http://localhost:8080');
    handleCoffeeScaleData(address, name);
  }
});

btSerial.inquire();
console.log(`Scanning for ${DEVICE_NAME}...`);

console.log('WebSocket server started at port 8001');
wsServer.listen(8001);
