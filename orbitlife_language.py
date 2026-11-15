"""Locale-respecting offline explanations. No patient data used by public assistant."""
import re

TOPIC_KEYWORDS={
 'hello':['hi','hello','hey','здраво','добар ден','добро утро','bonjour','salut','привет','здравствуйте'],
 'radiation':['radiation','dose','dosimeter','зрачењ','радијац','дозимет','лучев','rayonnement','rayon','радиац','доза'],
 'cortisol':['cortisol','кортизол'],
 'sleep':['sleep','спиењ','сон','sommeil','сон','спать'],
 'food':['food','meal','nutrition','breakfast','lunch','dinner','јадењ','храна','оброк','појадок','исхрана','repas','nourriture','déjeuner','питани','еда','завтрак'],
 'workload':['eva','workload','activity','работ','активност','нагрузк','charge de travail','sortie extravéhiculaire'],
 'health':['health','heart','symptom','здравје','здравствен','срце','симптом','santé','здоров','пульс'],
 'emergency':['emergency','urgent','incident','итен','итно','незгод','инцидент','urgence','accident','экстр','срочн'],
 'garmin':['garmin','часовник','montre','часы'],
 'rfid':['rfid','картичк','карта','carte'],
 'help':['how to','help','use orbitlife','како да','помош','aide','comment faire','помощ','как пользоваться'],
}
# More specific topics before broad ones
PRIORITY=['hello','emergency','cortisol','radiation','rfid','garmin','sleep','food','workload','health','help']

def topic_for(question):
 q=question.lower().strip().rstrip('!?.')
 if q in TOPIC_KEYWORDS['hello']:return 'hello'
 for key in PRIORITY[1:]:
  if any(x in q for x in TOPIC_KEYWORDS[key]):return key
 return 'fallback'

RESPONSES={
 'mk':{
  'hello':'Здраво. Јас сум општиот помошник на OrbitLife. Можеш да ме прашаш за дневното мени, пријавување мерења, зрачење или работата со апликацијата. Немам пристап до личните медицински записи.',
  'radiation':'Изложеноста на зрачење се следи преку примена доза во милисиверти и јачина на дозата во микросиверти на час. За вистинско мерење е потребен соодветен дозиметар. Необичните вредности треба да ги провери медицинскиот тим според правилата на мисијата.',
  'cortisol':'Резултатите од мерење кортизол во плунка зависат од времето поминато по будењето. Споредувај примероци земени во слично време и користи го референтниот опсег од лабораторијата. Отстапувањата треба да ги разгледа медицинско лице.',
  'sleep':'Запишувај ги часовите сон и следи го распоредот на мисијата. Ако проблемите со спиењето се повторуваат, разговарај со медицинскиот тим.',
  'food':'Во делот „Денешна исхрана“ можеш да ги видиш планираните оброци за секој астронаут. Оброкот се смета за изеден само откако астронаутот ќе го потврди. Количините и хранливите вредности се процени.',
  'workload':'Планот за исхрана ги зема предвид задачите и планираната физичка активност. При поголем напор се разгледува поголема потреба од енергија, со соодветен однос на јаглехидрати, белковини и масти.',
  'health':'Астронаутот може да ги запише дневните мерења, симптомите и активностите. Личната здравствена анализа е достапна само по најава со соодветни овластувања.',
  'emergency':'За итен случај притисни го црвеното копче „Итно“ и избери преглед на итна картичка или пријава. Во сериозна ситуација веднаш следи ги одобрените постапки и контактирај го медицинскиот тим. Апликацијата сама не повикува помош.',
  'garmin':'Податоците од носливите уреди во оваа верзија се симулирани. Поврзување со вистински часовник бара овластен пристап и согласност на корисникот.',
  'rfid':'Картичката за бесконтактна идентификација го избира профилот на астронаутот. За отворање приватни здравствени записи и понатаму е потребна лозинка.',
  'help':'Користи го главното мени за дневна проверка, исхрана, зрачење, лекови и историја на записи. Црвеното копче „Итно“ е достапно на секоја страница.',
  'fallback':'Офлајн помошникот одговара на општи прашања за OrbitLife, мисијата, исхраната и здравствените мерења. За пошироки прашања е потребна поврзана вештачка интелигенција со активен пристап. Личните медицински записи не се користат.'
 },
 'fr':{
  'hello':"Bonjour. Je suis l’assistant général d’OrbitLife. Vous pouvez me poser des questions sur les repas, les mesures quotidiennes, les radiations et l’utilisation de l’application. Je n’accède pas aux dossiers médicaux privés.",
  'radiation':"L’exposition est suivie par la dose en millisieverts et le débit de dose en microsieverts par heure. Un dosimètre adapté est nécessaire pour toute mesure réelle. Les résultats inhabituels doivent être examinés selon les procédures de la mission.",
  'cortisol':"Le taux de cortisol salivaire dépend du temps écoulé depuis le réveil. Comparez les prélèvements effectués à des moments similaires et utilisez les valeurs de référence du laboratoire. Tout écart nécessite un avis médical.",
  'sleep':"Consignez la durée du sommeil et respectez l’emploi du temps de la mission. En cas de troubles répétés, consultez l’équipe médicale.",
  'food':"La rubrique « Repas du jour » présente les menus prévus pour chaque astronaute. Un repas n’est compté comme consommé qu’après confirmation. Les portions et les apports nutritionnels sont des estimations.",
  'workload':"La planification des repas prend en compte la charge de travail et l’activité prévue. Un effort plus important peut nécessiter davantage d’énergie, avec un équilibre entre glucides, protéines et lipides.",
  'health':"Les astronautes peuvent enregistrer leurs mesures quotidiennes, leurs symptômes et leurs activités. L’analyse des données personnelles nécessite une connexion autorisée.",
  'emergency':"En cas d’urgence, utilisez le bouton rouge « Urgence » pour consulter une fiche ou signaler un incident. En situation grave, suivez immédiatement les procédures approuvées et contactez l’équipe médicale. L’application n’appelle pas automatiquement les secours.",
  'garmin':"Les données des appareils portables sont actuellement simulées. Une synchronisation réelle nécessite un accès autorisé et le consentement de la personne.",
  'rfid':"Une carte d’identification sans contact sélectionne le profil de l’astronaute. Un mot de passe reste nécessaire pour consulter les données médicales privées.",
  'help':"Utilisez le menu pour le suivi quotidien, les repas, les radiations, les médicaments et l’historique. Le bouton rouge « Urgence » reste disponible sur chaque page.",
  'fallback':"L’assistant hors ligne répond aux questions générales sur OrbitLife, la mission, l’alimentation et les mesures de santé. Pour d’autres sujets, un service d’intelligence artificielle connecté est nécessaire. Aucun dossier médical privé n’est utilisé."
 },
 'ru':{
  'hello':'Здравствуйте. Я общий помощник OrbitLife. Вы можете спросить о меню, ежедневных измерениях, радиации или использовании приложения. Я не имею доступа к личным медицинским записям.',
  'radiation':'Воздействие радиации отслеживается по дозе в миллизивертах и мощности дозы в микрозивертах в час. Для реального измерения нужен исправный дозиметр. Необычные значения следует проверять по утверждённым правилам миссии.',
  'cortisol':'Показатели кортизола в слюне зависят от времени после пробуждения. Сравнивайте образцы, взятые в сопоставимые периоды, и используйте лабораторные референсные значения. Отклонения требуют медицинской оценки.',
  'sleep':'Записывайте продолжительность сна и соблюдайте расписание миссии. Если нарушения повторяются, обратитесь к медицинскому экипажу.',
  'food':'В разделе «Меню на сегодня» показаны запланированные блюда каждого астронавта. Пища считается съеденной только после подтверждения. Порции и пищевые показатели являются оценочными.',
  'workload':'План питания учитывает запланированную нагрузку и активность. При тяжёлой работе потребность в энергии может увеличиваться с учётом углеводов, белков и жиров.',
  'health':'Астронавты могут записывать ежедневные показатели, симптомы и активность. Анализ личной медицинской истории доступен только после разрешённого входа.',
  'emergency':'При чрезвычайной ситуации используйте красную кнопку «Экстренно», чтобы открыть карточку или отправить сообщение. Следуйте утверждённым процедурам и свяжитесь с медицинской службой. Приложение не вызывает помощь автоматически.',
  'garmin':'Данные носимых устройств пока смоделированы. Настоящая синхронизация требует авторизованного доступа и согласия пользователя.',
  'rfid':'Бесконтактная карта выбирает аккаунт астронавта. Для доступа к личным медицинским записям по-прежнему нужен пароль.',
  'help':'Используйте меню для ежедневных проверок, питания, радиации, лекарств и истории записей. Красная кнопка «Экстренно» доступна на всех страницах.',
  'fallback':'Автономный помощник отвечает на общие вопросы об OrbitLife, миссии, питании и показателях здоровья. Для других тем требуется подключённый искусственный интеллект. Личные медицинские записи не используются.'
 }
}

def quick_answer(question,lang):
 if lang not in RESPONSES:return None
 return RESPONSES[lang][topic_for(question)]

PERSONAL={
 'mk':{
  'intro':'Здраво, {name}. Ова е преглед на твоите последни здравствени записи.',
  'empty':'Сè уште нема дневни записи. Внеси мерења во „Дневна проверка“ за да можеш да ги следиш промените.',
  'data':'Последни мерења: сон {sleep} часа, пулс во мирување {hr} удари во минута, телесна маса {mass} килограми, активност {exercise} минути и внесена вода {water} литри.',
  'incident':'Внимание: постојат {count} активни пријави за итен случај. Прегледај ги известувањата и следи ги одобрените постапки.',
  'advice':'Следи ги промените низ повеќе денови. Не носи медицински заклучоци само од едно мерење; при загрижувачки симптоми контактирај го медицинскиот тим.',
 },
 'fr':{
  'intro':'Bonjour {name}. Voici un aperçu de vos dernières données de santé.',
  'empty':"Aucun bilan quotidien n’a encore été enregistré. Saisissez vos mesures dans « Bilan quotidien » pour suivre leur évolution.",
  'data':'Dernières mesures : sommeil {sleep} heures, fréquence cardiaque au repos {hr} battements par minute, masse corporelle {mass} kilogrammes, activité {exercise} minutes et eau consommée {water} litres.',
  'incident':'Attention : {count} signalements d’urgence sont actifs. Consultez les annonces et suivez les procédures approuvées.',
  'advice':'Examinez les tendances sur plusieurs jours. Une mesure isolée ne permet pas un diagnostic. Consultez l’équipe médicale en cas de symptômes préoccupants.',
 },
 'ru':{
  'intro':'Здравствуйте, {name}. Ниже приведён обзор последних показателей здоровья.',
  'empty':'Ежедневных записей пока нет. Внесите измерения в раздел «Ежедневная проверка», чтобы отслеживать изменения.',
  'data':'Последние показатели: сон {sleep} часов, пульс в покое {hr} ударов в минуту, масса тела {mass} килограммов, активность {exercise} минут, вода {water} литров.',
  'incident':'Внимание: действуют {count} сообщений о чрезвычайных ситуациях. Проверьте объявления и следуйте утверждённым процедурам.',
  'advice':'Сравнивайте показатели за несколько дней. Отдельное измерение не позволяет поставить диагноз. При тревожных симптомах обратитесь к медицинской службе.',
 }
}

def personal_answer(lang,question,data,name,active_incidents=0):
 p=PERSONAL.get(lang)
 if not p:return None
 if question.lower().strip().rstrip('!.?') in TOPIC_KEYWORDS['hello']:
  return p['intro']
 pieces=[p['intro']]
 if active_incidents:pieces.append(p['incident'].format(count=active_incidents))
 if not data:pieces.append(p['empty'])
 else:
  def val(k):return '—' if data.get(k) is None else str(data[k])
  pieces.append(p['data'].format(sleep=val('sleep'),hr=val('hr'),mass=val('mass'),exercise=val('exercise'),water=val('water')))
 pieces.append(p['advice'])
 return '\n\n'.join(pieces)
