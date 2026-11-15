/* OrbitLife 20.1 - ESP32 Smart Mission Terminal (USB, OLED, RFID, encoder)
   Board: classic ESP32 DevKit / WROOM-32.
   OLED 0.96 SSD1306 I2C: SDA=16 SCL=17 VCC=3.3V GND=GND
   RC522 SPI: SS=21 SCK=18 MISO=19 MOSI=23 RST=22 3V3 and GND
   KY-040 encoder: CLK=32 DT=33 SW=25, +=3V3, GND=GND
   Libraries: U8g2, MFRC522. NO Wi-Fi, NO LCD parallel wiring.
   Paired cards can authorize a session on the local OrbitLife Python server.
   The ESP32 only reports the UID and never stores or transmits passwords.
   Serial protocol: newline delimited JSON, 115200 baud.
*/
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <U8g2lib.h>

constexpr uint8_t SDA_PIN=16,SCL_PIN=17,RFID_SS=21,RFID_RST=22;
constexpr uint8_t ENC_CLK=32,ENC_DT=33,ENC_SW=25;
MFRC522 card(RFID_SS,RFID_RST);
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0,U8X8_PIN_NONE,SCL_PIN,SDA_PIN);
const char* homeActions[]={"dashboard","food","login"};
const char* cardActions[]={"emergency","food","daily","radiation","body","medications","records","assistant","dashboard","login"};
constexpr int homeCount=3,cardCount=10;
// KY-040: one CLK falling edge per tactile detent, regardless of its other
// quadrature transitions. Set to -1 only if clockwise moves the menu up.
constexpr int8_t ENC_DIRECTION=1;
constexpr uint32_t ENC_DEBOUNCE_US=5000; // reject contact bounce within 5 ms
constexpr uint8_t ENC_QUEUE_CAPACITY=32; // power of two; preserves rapid reversals
portMUX_TYPE encoderMux=portMUX_INITIALIZER_UNLOCKED;
volatile int8_t encoderQueue[ENC_QUEUE_CAPACITY];
volatile uint8_t encoderWrite=0,encoderRead=0;
volatile uint32_t lastEncoderEdgeUs=0;

// Interrupts keep encoder clicks even while OLED I2C or RFID takes time.
void IRAM_ATTR onEncoderClock() {
  uint32_t now=micros();
  if((uint32_t)(now-lastEncoderEdgeUs)<ENC_DEBOUNCE_US)return;
  lastEncoderEdgeUs=now;
  int8_t delta=(digitalRead(ENC_DT)==HIGH?1:-1)*ENC_DIRECTION;
  portENTER_CRITICAL_ISR(&encoderMux);
  uint8_t next=(encoderWrite+1)&(ENC_QUEUE_CAPACITY-1);
  if(next!=encoderRead){encoderQueue[encoderWrite]=delta;encoderWrite=next;}
  portEXIT_CRITICAL_ISR(&encoderMux);
}

enum View{HOME,CARD,BROWSE};
View screen=HOME;
int selected=0;
bool prevRaw=HIGH,stableButton=HIGH,longHandled=false,rfidReady=false;
unsigned long changedAt=0,pressedAt=0,lastScan=0,lastDraw=0,lastCheck=0;
String timeText="--:--", language="mk",serialLine="",lastCard="",scannedName="Astronaut";

String getValue(const String& line,const String& key) {
  const String target="\""+key+"\"";
  int start=line.indexOf(target);if(start<0)return "";
  start=line.indexOf(':',start+target.length());if(start<0)return "";
  start++;while(start<(int)line.length() && line[start]==' ')start++;
  if(start>= (int)line.length())return "";
  if(line[start]=='\"'){int end=line.indexOf('"',start+1);return end<0?"":line.substring(start+1,end);}
  int end=start;while(end<(int)line.length() && line[end]!=',' && line[end]!='}')end++;
  return line.substring(start,end);
}
void event(const char* type){Serial.print("{\"type\":\"");Serial.print(type);Serial.println("\"}");}
void emitRotate(int delta){Serial.print("{\"type\":\"rotate\",\"delta\":");Serial.print(delta);Serial.println("}");}
void emitAction(const char* action){Serial.print("{\"type\":\"action\",\"action\":\"");Serial.print(action);Serial.println("\"}");}
const char* actionAt(int n){return screen==CARD?cardActions[n]:homeActions[n];}
int optionCount(){return screen==CARD?cardCount:homeCount;}

String label(const char* action){
  String a(action);
  if(language=="mk") {
    if(a=="dashboard")return "Главен преглед";
    if(a=="food")return "Денешна храна";
    if(a=="login")return screen==CARD?"Мој профил":"Најави се";
    if(a=="emergency")return "Итен случај";
    if(a=="daily")return "Дневна проверка";
    if(a=="radiation")return "Зрачење";
    if(a=="body")return "Пријави симптом";
    if(a=="medications")return "Лекови";
    if(a=="records")return "Здравств. записи";
    if(a=="assistant")return "Здравствен АИ";
  }
  if(language=="fr") {
    if(a=="dashboard")return "Tableau de bord";
    if(a=="food")return "Menu du jour";
    if(a=="login")return "Connexion";
    if(a=="emergency")return "Urgence";
    if(a=="daily")return "Bilan quotidien";
    if(a=="radiation")return "Radiations";
    if(a=="body")return "Symptomes";
    if(a=="medications")return "Medicaments";
    if(a=="records")return "Dossiers sante";
    if(a=="assistant")return "Assistant IA";
  }
  if(language=="ru") {
    if(a=="dashboard")return "Главный экран";
    if(a=="food")return "Меню на сегодня";
    if(a=="login")return "Войти";
    if(a=="emergency")return "Тревога";
    if(a=="daily")return "Проверка здоровья";
    if(a=="radiation")return "Радиация";
    if(a=="body")return "Симптомы";
    if(a=="medications")return "Лекарства";
    if(a=="records")return "История здоровья";
    if(a=="assistant")return "Помощник ИИ";
  }
  if(a=="dashboard")return "Main dashboard";
  if(a=="food")return "Today's food";
  if(a=="login")return screen==CARD?"My profile":"Sign in";
  if(a=="emergency")return "Emergency";
  if(a=="daily")return "Daily check-in";
  if(a=="radiation")return "Radiation";
  if(a=="body")return "Symptoms";
  if(a=="medications")return "Medications";
  if(a=="records")return "Health records";
  if(a=="assistant")return "Health AI";
  return a;
}
void draw(){
  if(millis()-lastDraw<130)return;
  lastDraw=millis();
  display.clearBuffer();
  display.setFont(u8g2_font_6x13_t_cyrillic);
  display.drawUTF8(1,11,"ORBITLIFE");
  display.setCursor(95,11);display.print(timeText);
  display.drawHLine(0,15,128);
  if(screen==BROWSE){
    display.drawUTF8(1,29,language=="mk"?"КОНТРОЛА":language=="ru"?"УПРАВЛЕНИЕ":"WEB CONTROL");
    display.drawUTF8(1,43,language=="mk"?"Врти и притисни":language=="ru"?"Крути и нажми":"Turn and press");
    display.drawUTF8(1,58,language=="mk"?"Држи = назад":"Hold = back");
  }else{
    if(screen==CARD){
      String greeting=(language=="mk"?"Здраво, ":language=="ru"?"Привет, ":language=="fr"?"Bonjour ":"Hello, ")+scannedName+"!";
      display.drawUTF8(1,28,greeting.c_str());
    }
    else display.drawUTF8(1,28,language=="mk"?"Мени за мисија":language=="ru"?"Меню миссии":"Mission menu");
    String one=label(actionAt(selected));
    String two=label(actionAt((selected+1)%optionCount()));
    display.drawUTF8(0,43,(String(">")+one).c_str());
    display.drawUTF8(7,57,two.c_str());
  }
  display.sendBuffer();
}
void readHost(){
  while(Serial.available()){
    char ch=(char)Serial.read();
    if(ch=='\n'){
      String line=serialLine;serialLine="";
      String type=getValue(line,"type");
      if(type=="screen"){
        String value=getValue(line,"mode");
        if(value=="home"){screen=HOME;selected=0;}
        else if(value=="card"){screen=CARD;selected=0;}
        else if(value=="browse"){screen=BROWSE;selected=0;}
      }else if(type=="identity"){
        String name=getValue(line,"name");
        if(name.length()>0 && name.length()<=24)scannedName=name;
      }else if(type=="select"){
        int value=getValue(line,"index").toInt();
        if(screen!=BROWSE && value>=0 && value<optionCount())selected=value;
      }else if(type=="clock"){
        String value=getValue(line,"value");
        if(value.length()==5)timeText=value;
      }else if(type=="language"){
        String value=getValue(line,"value");
        if(value=="mk"||value=="ru"||value=="fr"||value=="en")language=value;
      }
    }else if(ch!='\r' && serialLine.length()<180)serialLine+=ch;
  }
}
void readEncoder(){
  // Consume exactly one queued event per CLK detent. No quadrature
  // accumulation, so a single encoder click always moves one menu item.
  while(true){
    portENTER_CRITICAL(&encoderMux);
    if(encoderRead==encoderWrite){portEXIT_CRITICAL(&encoderMux);break;}
    int8_t delta=encoderQueue[encoderRead];
    encoderRead=(encoderRead+1)&(ENC_QUEUE_CAPACITY-1);
    portEXIT_CRITICAL(&encoderMux);
    if(screen!=BROWSE)selected=(selected+delta+optionCount())%optionCount();
    emitRotate(delta);
  }
}
void shortPress(){
  if(screen==BROWSE){event("press");return;}
  const char* action=actionAt(selected);
  emitAction(action);
  screen=BROWSE;
}
void longPress(){
  if(screen==BROWSE || screen==CARD){screen=HOME;selected=0;}
  event("back");
}
void readButton(){
  bool raw=digitalRead(ENC_SW);uint32_t now=millis();
  if(raw!=prevRaw){prevRaw=raw;changedAt=now;}
  if(now-changedAt>=35 && raw!=stableButton){
    stableButton=raw;
    if(raw==LOW){pressedAt=now;longHandled=false;}
    else if(!longHandled){shortPress();}
  }
  if(stableButton==LOW&&!longHandled&&now-pressedAt>=850){longHandled=true;longPress();}
}
void checkCard(){
  card.PCD_Init();delay(15);
  uint8_t version=card.PCD_ReadRegister(MFRC522::VersionReg);
  rfidReady=version!=0x00 && version!=0xFF;
}
void readCard(){
  if(!rfidReady||millis()-lastScan<1800)return;
  if(!card.PICC_IsNewCardPresent() || !card.PICC_ReadCardSerial())return;
  String uid="";
  for(byte i=0;i<card.uid.size;i++){
    if(card.uid.uidByte[i]<16)uid+='0';
    uid+=String(card.uid.uidByte[i],HEX);
  }
  uid.toUpperCase();lastCard=uid;
  Serial.print("{\"type\":\"card\",\"uid\":\"");Serial.print(uid);Serial.println("\"}");
  card.PICC_HaltA();card.PCD_StopCrypto1();
  screen=CARD;selected=0;lastScan=millis();
}
void setup(){
  Serial.begin(115200);delay(250);
  Wire.begin(SDA_PIN,SCL_PIN);
  display.setI2CAddress(0x3C*2);
  display.begin();
  pinMode(ENC_CLK,INPUT_PULLUP);pinMode(ENC_DT,INPUT_PULLUP);pinMode(ENC_SW,INPUT_PULLUP);
  // Falling CLK edge occurs once per notch on the KY-040.
  attachInterrupt(digitalPinToInterrupt(ENC_CLK),onEncoderClock,FALLING);
  SPI.begin(18,19,23,RFID_SS);checkCard();
  event("hello");
  draw();
}
void loop(){
  readHost();readEncoder();readButton();readCard();
  if(!rfidReady && millis()-lastCheck>3000){lastCheck=millis();checkCard();}
  draw();delay(1);
}
