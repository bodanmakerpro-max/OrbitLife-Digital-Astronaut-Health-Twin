'use strict';
/* PulseDeck 10: global emergency access, account preferences, incident photos, cortisol.
   Connected data stays local to the Python server, except when user explicitly enables connected AI. */
(() => {
  const q=id=>document.getElementById(id);
  const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fallbackImg=id=>`portraits/${id}.webp`;
  const avatarOverrides={};
  const originalPortrait=portrait;
  portrait=function(id){return avatarOverrides[id] || state.crew.find(c=>c.astronaut_id===id)?.avatar_url || originalPortrait(id);};
  let emergencyTarget=null, emergencyCard=null, lastFile=null, lastIncidentId=null, incidents=[], cortisol=[], cortisolAstro=null;
  let locale='en';
  const dictionary={
    ru:{
      "Emergency":"Экстренно",
      "Emergency access":"Экстренный доступ",
      "Choose an astronaut":"Выберите астронавта",
      "Switch astronaut":"Сменить астронавта",
      "Report an emergency":"Сообщить о происшествии",
      "Back to card":"Назад к карточке",
      "View emergency card":"Экстренная карточка",
      "Verified details for any astronaut":"Проверенные данные астронавта",
      "Notify the crew and medical team dashboard":"Оповестить экипаж и медслужбу",
      "Astronaut":"Астронавт",
      "Location":"Место",
      "Short description":"Краткое описание",
      "Urgency":"Срочность",
      "Photo (optional)":"Фото (необязательно)",
      "Save emergency report":"Сохранить сообщение",
      "Official name":"Полное имя",
      "Verified allergies":"Подтверждённые аллергии",
      "Verified conditions":"Подтверждённые заболевания",
      "Relevant verified medications":"Проверенные лекарства",
      "Approved emergency instructions":"Утверждённые инструкции",
      "Crew medical contact":"Медицинский контакт",
      "Last verified":"Дата проверки",
      "Verified by":"Проверено",
      "Unknown":"Неизвестно",
      "None known":"Нет известных",
      "Crew overview":"Экипаж",
      "My dashboard":"Моя панель",
      "Daily check-in":"Ежедневная проверка",
      "Wearable health":"Данные часов",
      "Radiation exposure":"Радиация",
      "Cortisol":"Кортизол",
      "Symptoms & body map":"Симптомы и тело",
      "Medications":"Лекарства",
      "Meals & nutrition":"Питание",
      "Emergency details":"Экстренные данные",
      "AI health assistant":"Медицинский ИИ",
      "Quick AI":"Быстрый ИИ",
      "My crew profile":"Мой профиль",
      "Settings":"Настройки",
      "Health tracking":"Мониторинг здоровья",
      "Safety & assistance":"Безопасность и помощь",
      "Account":"Учётная запись",
      "Log out":"Выход",
      "Crew sign in →":"Вход экипажа →",
      "Log in":"Войти",
      "Sign in":"Вход",
      "Appearance and profile":"Вид и профиль",
      "Saved to your crew account":"Сохранено для вашей учётной записи",
      "Language":"Язык",
      "Theme":"Тема",
      "Accent color":"Акцентный цвет",
      "Profile photo":"Фото профиля",
      "Dashboard status":"Статус на главной",
      "Show my status on the crew dashboard":"Показывать статус экипажу",
      "Save preferences":"Сохранить настройки",
      "Upload profile photo":"Загрузить фото",
      "Settings follow your account on shared devices.":"Настройки сохраняются в аккаунте на общих устройствах.",
      "Light":"Светлая",
      "Dark":"Тёмная",
      "System":"Системная",
      "Mission health overview":"Обзор здоровья экипажа",
      "Find crew member":"Найти астронавта",
      "Refresh status ↻":"Обновить статус ↻",
      "All crew":"Весь экипаж",
      "On track":"В норме",
      "Needs review":"Нужна проверка",
      "Critical / urgent":"Критично / срочно",
      "Medical timeline":"Медицинская история",
      "Latest incidents":"Последние происшествия",
      "Active incidents":"Активные происшествия",
      "No incidents recorded.":"Происшествий нет.",
      "Medical contact":"Медицинский контакт",
      "Allergies":"Аллергии",
      "View emergency details":"Открыть экстренные данные",
      "Profile emergency summary":"Экстренные сведения",
      "Reported by":"Сообщил",
      "Open emergency card":"Открыть экстренную карточку",
      "Mark resolved":"Отметить решённым",
      "Retry photo":"Повторить фото",
      "Saved incident":"Сообщение сохранено",
      "Photo uploaded":"Фото загружено",
      "Photo pending":"Фото ожидает загрузки",
      "Low":"Низкая",
      "Moderate":"Средняя",
      "High":"Высокая",
      "Critical":"Критическая",
      "Active":"Активно",
      "Resolved":"Решено",
      "Personal mission dashboard":"Личная панель",
      "Recent health readings":"Последние показатели",
      "Sleep (hours)":"Сон (часы)",
      "Resting heart rate (bpm)":"Пульс в покое (уд/мин)",
      "Oxygen SpO₂ (%)":"Кислород SpO₂ (%)",
      "Body mass (kg)":"Масса тела (кг)",
      "Body temperature (°C)":"Температура тела (°C)",
      "Blood glucose (mg/dL)":"Глюкоза (мг/дл)",
      "Exercise (min)":"Тренировка (мин)",
      "Water consumed (L)":"Выпито воды (л)",
      "Mood":"Настроение",
      "Stress (1 low to 5 high)":"Стресс (1–5)",
      "Fatigue (1 low to 5 high)":"Усталость (1–5)",
      "Daily notes":"Заметки за день",
      "Date":"Дата",
      "Mass measurement method":"Способ измерения массы",
      "Glucose timing":"Время измерения глюкозы",
      "Systolic blood pressure":"Систолическое давление",
      "Diastolic blood pressure":"Диастолическое давление",
      "Save today's check-in":"Сохранить данные",
      "Record today's measurements":"Измерения за сегодня",
      "Saved check-ins":"Сохранённые записи",
      "Food category":"Категория еды",
      "Food item":"Продукт",
      "Meal":"Приём пищи",
      "Servings":"Порции",
      "Calories (optional)":"Калории (необязательно)",
      "Notes":"Примечания",
      "Medication name":"Название препарата",
      "Approved schedule":"Утверждённый график",
      "Instructions / notes":"Инструкции / заметки",
      "Date of birth":"Дата рождения",
      "Gender":"Пол",
      "Race / ethnicity":"Этническое происхождение",
      "Nationality":"Гражданство",
      "Known strengths / personal perks":"Сильные стороны",
      "About the astronaut":"Об астронавте",
      "Favorite foods":"Любимые блюда",
      "Daily eating pattern":"Режим питания",
      "Cortisol tracking":"Мониторинг кортизола",
      "HORMONE HEALTH":"ГОРМОНАЛЬНОЕ ЗДОРОВЬЕ",
      "Cortisol trend":"График кортизола",
      "Similar time since waking":"Похожее время после пробуждения",
      "Compare sample timing":"Время взятия образца",
      "Units":"Единицы",
      "Saliva test history":"История анализов слюны",
      "Enter lab result":"Результат анализа",
      "Authorized medical crew":"Уполномоченный медперсонал",
      "Collection date and time":"Дата и время сбора",
      "Minutes since waking":"Минут после пробуждения",
      "Result":"Результат",
      "Source":"Источник",
      "Lab reference minimum":"Нижняя граница лаборатории",
      "Lab reference maximum":"Верхняя граница лаборатории",
      "Lab / report reference":"Лаборатория / номер отчёта",
      "Save cortisol result":"Сохранить кортизол",
      "Medical staff only":"Только медперсонал",
      "Verify emergency essentials":"Проверка экстренной информации",
      "Save verification":"Сохранить проверку",
      "No results yet.":"Данных пока нет.",
      "Simulated":"Симуляция",
      "Lab measured":"Измерено в лаборатории",
      "Medical review":"Медицинская проверка",
      "Offline assistant":"Офлайн-помощник",
      "Connected AI (requires credits)":"Подключённый ИИ (нужны кредиты)",
      "Current password":"Текущий пароль",
      "New password (at least 12 characters)":"Новый пароль (от 12 символов)",
      "Personal account":"Личный аккаунт",
      "Change password":"Сменить пароль",
      "Submit":"Отправить",
      "Send report":"Отправить отчёт",
      "Preferences saved":"Настройки сохранены",
      "Logged out.":"Выход выполнен.",
      "Medical verification saved":"Проверка сохранена",
      "Cortisol result saved":"Результат кортизола сохранён",
      "Incident resolved":"Происшествие закрыто",
      "Daily check-in saved":"Запись сохранена",
      "Emergency report":"Экстренное сообщение",
      "Collapse menu":"Свернуть меню",
      "Expand menu":"Развернуть меню",
      "Search pages or actions":"Поиск страниц и действий",
      "Quick actions":"Быстрые действия",
      "Report symptom":"Сообщить о симптоме",
      "New check-in":"Новая запись",
      "Ask AI":"Спросить ИИ",
      "Check-in":"Проверка",
      "Medical record":"Медкарта",
      "Incident announcements":"Сообщения о происшествиях",
      "Active emergency reports":"Активные экстренные сообщения",
      "No active emergency reports":"Нет активных экстренных сообщений",
      "View profile":"Открыть профиль",
      "Report":"Сообщить",
      "Summary":"Сводка"
    },
    mk:{
      'Emergency':'Итно','Emergency access':'Итен пристап','Choose an astronaut':'Избери астронаут','Switch astronaut':'Смени астронаут',
      'Report an emergency':'Пријави итен случај','Back to card':'Назад на картичка','Astronaut':'Астронаут','Location':'Локација',
      'Short description':'Краток опис','Urgency':'Итност','Photo (optional)':'Фотографија (опционално)',
      'Save emergency report':'Зачувај пријава','Official name':'Официјално име','Verified allergies':'Потврдени алергии',
      'Verified conditions':'Потврдени состојби','Relevant verified medications':'Потврдени лекови',
      'Approved emergency instructions':'Одобрени итни инструкции','Crew medical contact':'Медицински контакт',
      'Last verified':'Последна проверка','Unknown':'Непознато','None known':'Нема познати','Verified by':'Проверено од',
      'Appearance and profile':'Изглед и профил','Saved to your crew account':'Зачувано на твојот профил',
      'Language':'Јазик','Theme':'Тема','Accent color':'Боја на профилот','Profile photo':'Слика на профил',
      'Dashboard status':'Статус на контролната табла','Show my status on the crew dashboard':'Прикажи го мојот статус на таблата',
      'Save preferences':'Зачувај поставки','Upload profile photo':'Постави профилна слика',
      'Settings follow your account on shared devices.':'Поставките го следат твојот профил на заеднички уреди.',
      'Medical timeline':'Медицинска историја','Latest incidents':'Последни инциденти','Active incidents':'Активни инциденти',
      'Cortisol tracking':'Следење на кортизол','HORMONE HEALTH':'ХОРМОНАЛНО ЗДРАВЈЕ','Cortisol trend':'Тренд на кортизол',
      'Similar time since waking':'Слично време по будење','Compare sample timing':'Спореди време на земање',
      'Units':'Единици','Saliva test history':'Историја на тестови со плунка','Enter lab result':'Внеси лабораториски резултат',
      'Authorized medical crew':'Овластен медицински персонал','Collection date and time':'Датум и време на земање',
      'Minutes since waking':'Минути по будење','Result':'Резултат','Source':'Извор',
      'Lab reference minimum':'Лабораториски минимум','Lab reference maximum':'Лабораториски максимум',
      'Lab / report reference':'Лабораторија / извештај','Save cortisol result':'Зачувај резултат',
      'Verify emergency essentials':'Потврди итни податоци','Medical staff only':'Само медицински персонал',
      'Save verification':'Зачувај потврда','Crew overview':'Преглед на екипажот','My dashboard':'Мојата табла',
      'Daily check-in':'Дневна проверка','Wearable health':'Податоци од часовник','Radiation exposure':'Изложеност на зрачење',
      'Symptoms & body map':'Симптоми и тело','Medications':'Лекови','Meals & nutrition':'Оброци и исхрана',
      'Emergency details':'Итни податоци','AI health assistant':'Здравствен AI асистент',
      'My crew profile':'Мој профил','Settings':'Поставки','Log out':'Одјави се','Crew sign in →':'Најави се →',
      'Health tracking':'Следење здравје','Safety & assistance':'Безбедност и помош','Account':'Профил',
      'Light':'Светла','Dark':'Темна','System':'Системска','Moderate':'Умерено','High':'Високо','Critical':'Критично',
      'Low':'Ниско','Open emergency card':'Отвори итна картичка','Close':'Затвори','Active':'Активно','Resolved':'Решено',
      'Retry photo':'Повтори слика','Saved incident':'Зачуван инцидент','Photo uploaded':'Сликата е поставена',
      'Photo pending':'Сликата чека поставување','Reported by':'Пријавено од','Mark resolved':'Означи како решено',
      'Profile emergency summary':'Итен преглед на профилот','Allergies':'Алергии','Medical contact':'Медицински контакт',
      'View emergency details':'Види итни детали','No incidents recorded.':'Нема пријавени инциденти.',
      'Simulated':'Симулирано','Lab measured':'Лабораториски измерено','Medical review':'Медицинска проверка',
      'No results yet.':'Сè уште нема резултати.','Sign in to view emergency cards.':'Најави се за итни картички.',
      'Sign in':'Најави се','Mission health overview':'Преглед на здравјето на екипажот','Find crew member':'Најди член на екипаж',
      'Refresh status ↻':'Освежи статус ↻','All crew':'Цел екипаж','On track':'Во ред','Needs review':'Потребна проверка',
      'Critical / urgent':'Критично / итно','Personal mission dashboard':'Лична мисионска табла',
      'Recent health readings':'Последни здравствени мерења','Change password':'Промени лозинка',
      'Personal account':'Лична сметка','Your astronaut digital identity and password.':'Твојот профил и лозинка.',
      'Old password':'Стара лозинка','Current password':'Тековна лозинка',
      'Blood type':'Крвна група','Body temperature':'Телесна температура','Heart rate':'Пулс','Sleep':'Спиење',
      'Cortisol':'Кортизол','Daily health':'Дневно здравје','General dashboard':'Општа табла'
    },
    fr:{
      'Emergency':'Urgence','Emergency access':"Accès d'urgence",'Choose an astronaut':'Choisir un astronaute',
      'Switch astronaut':"Changer d'astronaute",'Report an emergency':'Signaler une urgence','Back to card':'Retour à la fiche',
      'Astronaut':'Astronaute','Location':'Lieu','Short description':'Description courte','Urgency':'Urgence',
      'Photo (optional)':'Photo (facultative)','Save emergency report':'Enregistrer le signalement',
      'Official name':'Nom officiel','Verified allergies':'Allergies vérifiées','Verified conditions':'Conditions médicales vérifiées',
      'Relevant verified medications':'Médicaments vérifiés','Approved emergency instructions':"Consignes d'urgence approuvées",
      'Crew medical contact':'Contact médical de bord','Last verified':'Dernière vérification',
      'Unknown':'Inconnu','None known':'Aucun connu','Verified by':'Vérifié par',
      'Appearance and profile':'Apparence et profil','Saved to your crew account':'Enregistré sur votre compte',
      'Language':'Langue','Theme':'Thème','Accent color':"Couleur d'accent",'Profile photo':'Photo de profil',
      'Dashboard status':'Statut du tableau de bord','Show my status on the crew dashboard':'Afficher mon statut sur le tableau de bord',
      'Save preferences':'Enregistrer les préférences','Upload profile photo':'Téléverser la photo de profil',
      'Settings follow your account on shared devices.':'Vos préférences sont retrouvées sur les appareils partagés.',
      'Medical timeline':'Chronologie médicale','Latest incidents':'Derniers incidents','Active incidents':'Incidents actifs',
      'Cortisol tracking':'Suivi du cortisol','HORMONE HEALTH':'SANTÉ HORMONALE','Cortisol trend':'Tendance du cortisol',
      'Similar time since waking':'Même délai depuis le réveil','Compare sample timing':'Comparer le moment du prélèvement',
      'Units':'Unités','Saliva test history':'Historique des tests salivaires','Enter lab result':'Saisir un résultat de laboratoire',
      'Authorized medical crew':'Personnel médical autorisé','Collection date and time':'Date et heure du prélèvement',
      'Minutes since waking':'Minutes depuis le réveil','Result':'Résultat','Source':'Source',
      'Lab reference minimum':'Minimum de référence du labo','Lab reference maximum':'Maximum de référence du labo',
      'Lab / report reference':'Laboratoire / référence du rapport','Save cortisol result':'Enregistrer le cortisol',
      'Verify emergency essentials':'Vérifier les données essentielles','Medical staff only':'Personnel médical uniquement',
      'Save verification':'Enregistrer la vérification','Crew overview':"Vue de l'équipage",'My dashboard':'Mon tableau de bord',
      'Daily check-in':'Bilan quotidien','Wearable health':'Données de montre','Radiation exposure':'Exposition aux radiations',
      'Symptoms & body map':'Symptômes et corps','Medications':'Médicaments','Meals & nutrition':'Repas et nutrition',
      'Emergency details':"Informations d'urgence",'AI health assistant':'Assistant santé IA',
      'My crew profile':"Mon profil d'équipage",'Settings':'Paramètres','Log out':'Déconnexion',
      'Crew sign in →':'Connexion équipage →','Health tracking':'Suivi de santé',
      'Safety & assistance':'Sécurité et assistance','Account':'Compte','Light':'Clair','Dark':'Sombre','System':'Système',
      'Moderate':'Modérée','High':'Élevée','Critical':'Critique','Low':'Faible','Open emergency card':'Ouvrir la fiche urgence',
      'Close':'Fermer','Active':'Actif','Resolved':'Résolu','Retry photo':"Réessayer la photo",'Saved incident':'Incident enregistré',
      'Photo uploaded':'Photo envoyée','Photo pending':'Photo en attente','Reported by':'Signalé par',
      'Mark resolved':'Marquer comme résolu','Profile emergency summary':"Résumé d'urgence du profil",
      'Allergies':'Allergies','Medical contact':'Contact médical','View emergency details':"Voir la fiche d'urgence",
      'No incidents recorded.':'Aucun incident enregistré.','Simulated':'Simulé','Lab measured':'Mesure en laboratoire',
      'Medical review':'Examen médical','No results yet.':'Aucun résultat pour le moment.',
      'Sign in to view emergency cards.':'Connectez-vous pour voir les fiches urgence.',
      'Sign in':'Connexion','Mission health overview':'Suivi de santé de l’équipage','Find crew member':'Rechercher un membre',
      'Refresh status ↻':'Actualiser ↻','All crew':'Tout l’équipage','On track':'Normal','Needs review':'À vérifier',
      'Critical / urgent':'Critique / urgent','Personal mission dashboard':'Tableau de bord personnel',
      'Recent health readings':'Dernières mesures de santé','Change password':'Changer le mot de passe',
      'Personal account':'Compte personnel','Your astronaut digital identity and password.':'Votre identité et mot de passe.',
      'Current password':'Mot de passe actuel','Blood type':'Groupe sanguin','Body temperature':'Température corporelle',
      'Heart rate':'Fréquence cardiaque','Sleep':'Sommeil','Cortisol':'Cortisol','Daily health':'Santé quotidienne',
      'General dashboard':'Tableau de bord général'
    }
  };
  Object.assign(dictionary.mk,{
    'Date':'Датум','Date of birth':'Датум на раѓање','Gender':'Пол','Race / ethnicity':'Расна / етничка припадност',
    'Nationality':'Националност','Known strengths / personal perks':'Вештини и силни страни',
    'About the astronaut':'За астронаутот','Favorite foods':'Омилена храна','Daily eating pattern':'Навики во исхраната',
    'Sleep (hours)':'Спиење (часови)','Resting heart rate (bpm)':'Пулс во мирување (bpm)',
    'Oxygen SpO₂ (%)':'Кислород SpO₂ (%)','Systolic blood pressure':'Систолен притисок',
    'Diastolic blood pressure':'Дијастолен притисок','Body mass (kg)':'Телесна маса (kg)',
    'Body temperature (°C)':'Телесна температура (°C)','Blood glucose (mg/dL)':'Шеќер во крв (mg/dL)',
    'Exercise (min)':'Вежбање (мин)','Water consumed (L)':'Испиена вода (L)','Mood':'Расположение',
    'Stress (1 low to 5 high)':'Стрес (1 до 5)','Fatigue (1 low to 5 high)':'Замор (1 до 5)',
    'Mass measurement method':'Метод за мерење маса','Glucose timing':'Време на мерење глукоза',
    'Measurement time (local)':'Време на мерење (локално)','Incremental dose (mSv)':'Дополнителна доза (mSv)',
    'Dose rate (µSv/h)':'Стапка на доза (µSv/h)','Data source':'Извор на податоци',
    'Location / activity':'Локација / активност','Measurement notes':'Белешки за мерењето',
    'Choose CSV file':'Избери CSV датотека','Prior career effective dose (mSv)':'Претходна професионална доза (mSv)',
    'Severity (1 mild to 5 severe)':'Јачина (1 до 5)','When did it begin?':'Кога започна?',
    'Describe what you feel':'Опиши што чувствуваш','Medication name':'Име на лек',
    'Approved schedule':'Одобрен распоред','Instructions / notes':'Упатства / белешки',
    'Food category':'Категорија храна','Food item':'Храна','Meal':'Оброк','Servings':'Порции',
    'Meal record':'Запис за оброк','Calories (optional)':'Калории (опционално)','Notes':'Белешки',
    'Emergency / mission medical contact':'Итен / медицински контакт','Known allergies':'Познати алергии',
    'Relevant health conditions':'Здравствени состојби','Dietary restrictions':'Ограничувања во исхраната',
    'Emergency notes':'Итни белешки','Offline assistant':'Офлајн асистент',
    'Connected AI (requires credits)':'Поврзан AI (потребни кредити)',
    'New password (at least 12 characters)':'Нова лозинка (најмалку 12 знаци)',
    'Send report':'Испрати извештај','Record readings':'Зачувај мерења',
    'Preferences saved':'Поставките се зачувани','Logged out.':'Одјавено.','Login':'Најава',
    'Log in':'Најави се','Medical verification saved':'Медицинската потврда е зачувана',
    'Cortisol result saved':'Резултатот за кортизол е зачуван','Incident resolved':'Инцидентот е решен',
    'Photo uploaded':'Фотографијата е поставена','All times (not directly comparable)':'Сите времиња (не се директно споредливи)',
    'Daily check-in saved':'Дневниот запис е зачуван'
  });
  Object.assign(dictionary.fr,{
    'Date':'Date','Date of birth':'Date de naissance','Gender':'Genre','Race / ethnicity':'Origine ethnique',
    'Nationality':'Nationalité','Known strengths / personal perks':'Points forts et aptitudes',
    'About the astronaut':"À propos de l’astronaute",'Favorite foods':'Aliments préférés',
    'Daily eating pattern':'Habitudes alimentaires','Sleep (hours)':'Sommeil (heures)',
    'Resting heart rate (bpm)':'Fréquence cardiaque au repos (bpm)',
    'Oxygen SpO₂ (%)':'Oxygène SpO₂ (%)','Systolic blood pressure':'Pression systolique',
    'Diastolic blood pressure':'Pression diastolique','Body mass (kg)':'Masse corporelle (kg)',
    'Body temperature (°C)':'Température corporelle (°C)','Blood glucose (mg/dL)':'Glycémie (mg/dL)',
    'Exercise (min)':'Exercice (min)','Water consumed (L)':'Eau consommée (L)','Mood':'Humeur',
    'Stress (1 low to 5 high)':'Stress (1 à 5)','Fatigue (1 low to 5 high)':'Fatigue (1 à 5)',
    'Mass measurement method':'Méthode de mesure de masse','Glucose timing':'Moment de la glycémie',
    'Measurement time (local)':'Heure de mesure (locale)','Incremental dose (mSv)':'Dose supplémentaire (mSv)',
    'Dose rate (µSv/h)':'Débit de dose (µSv/h)','Data source':'Source des données',
    'Location / activity':'Lieu / activité','Measurement notes':'Notes de mesure','Choose CSV file':'Choisir un fichier CSV',
    'Prior career effective dose (mSv)':'Dose cumulée antérieure (mSv)',
    'Severity (1 mild to 5 severe)':'Gravité (1 à 5)','When did it begin?':'Quand cela a-t-il commencé ?',
    'Describe what you feel':'Décrivez vos symptômes','Medication name':'Nom du médicament',
    'Approved schedule':'Calendrier approuvé','Instructions / notes':'Consignes / notes',
    'Food category':'Catégorie d’aliments','Food item':'Aliment','Meal':'Repas','Servings':'Portions',
    'Meal record':'Journal des repas','Calories (optional)':'Calories (facultatif)','Notes':'Notes',
    'Emergency / mission medical contact':'Contact médical de la mission','Known allergies':'Allergies connues',
    'Relevant health conditions':'Conditions médicales','Dietary restrictions':'Restrictions alimentaires',
    'Emergency notes':"Notes d’urgence",'Offline assistant':'Assistant hors ligne',
    'Connected AI (requires credits)':'IA connectée (crédits requis)',
    'New password (at least 12 characters)':'Nouveau mot de passe (12 caractères min.)',
    'Send report':'Envoyer le rapport','Record readings':'Enregistrer les mesures',
    'Preferences saved':'Préférences enregistrées','Logged out.':'Déconnecté.',
    'Medical verification saved':'Vérification médicale enregistrée',
    'Cortisol result saved':'Résultat de cortisol enregistré','Incident resolved':'Incident résolu',
    'All times (not directly comparable)':'Toutes les heures (non directement comparables)',
    'Daily check-in saved':'Bilan quotidien enregistré'
  });
  Object.assign(dictionary.ru,{
    "Quick AI":"Быстрый ИИ",
    "General questions. No private health data is shared.":"Общие вопросы. Личные медицинские данные не передаются.",
    "Ask about PulseDeck, the ISS, radiation, food or daily routines.":"Спросите об PulseDeck, МКС, радиации, питании или распорядке дня.",
    "Ask Quick AI":"Спросить ИИ",
    "Mode":"Режим",
    "Offline answers":"Офлайн-ответы",
    "Connected AI (requires API credits)":"Подключённый ИИ (нужны API-кредиты)",
    "Your question":"Ваш вопрос",
    "Crew-submitted reports. Select a report to view the astronaut’s verified emergency details.":"Сообщения экипажа. Выберите событие, чтобы открыть проверенную экстренную карточку астронавта.",
    "Incident announcements":"Объявления о происшествиях",
    "No active emergency reports":"Нет активных экстренных сообщений",
    "Active emergency reports":"Активные экстренные сообщения",
    "View emergency card":"Открыть экстренную карточку",
    "Verified details for any astronaut":"Проверенные данные любого астронавта",
    "Notify the crew and medical team dashboard":"Сообщение экипажу и медслужбе",
    "Mission health overview":"Обзор здоровья экипажа",
    "Daily health check-in":"Ежедневная проверка здоровья",
    "Saved check-ins":"Сохранённые записи",
    "Record today's measurements":"Введите сегодняшние показатели",
    "Save today's check-in":"Сохранить запись",
    "General dashboard":"Общая панель",
    "Open health dashboard":"Открыть личную панель",
    "Open full emergency record":"Полная экстренная запись",
    "Emergency information":"Экстренная информация",
    "Report a medical concern":"Сообщить о проблеме со здоровьем",
    "Emergency medical profile":"Экстренный медицинский профиль",
    "Last 7 days":"Последние 7 дней",
    "Medical record":"Медицинская карта",
    "Emergency quick reference":"Краткая экстренная справка",
    "Emergency health information":"Экстренная медицинская информация",
    "View crew status, priority actions and latest check-ins. Select an astronaut for more details.":"Статус экипажа, задачи и последние проверки. Выберите астронавта для просмотра.",
    "Record vitals, daily activity, sleep and how you feel. Your trends update as soon as you save.":"Записывайте показатели, активность, сон и самочувствие. Графики обновятся после сохранения.",
    "Choose from ISS-documented foods, then record meals, appetite and energy intake.":"Выберите еду из списка МКС и запишите питание, аппетит и потребление энергии.",
    "Record a dosimeter reading":"Записать показание дозиметра",
    "Radiation dose history":"История дозы облучения",
    "Data source":"Источник данных",
    "Logged mission dose":"Записанная доза за миссию",
    "Quick access to important medical details for an astronaut and their authorized mission medical team.":"Быстрый доступ к важным медицинским данным экипажа.",
    "Ask about daily check-ins, simulated wearable data, symptoms, radiation, nutrition and bone-health reference.":"Спрашивайте о ежедневных показателях, данных часов, симптомах, радиации и питании.",
    "Record prescribed or approved medicines and whether they were taken today. This app does not prescribe treatments.":"Запишите назначенные лекарства и факт приёма. Приложение не назначает лечение.",
    "Current medications":"Текущие лекарства",
    "Add a medication":"Добавить лекарство",
    "Add medication":"Добавить препарат",
    "History":"История",
    "Search name or ID...":"Поиск по имени или ID...",
    "Select an astronaut":"Выберите астронавта",
    "Offline assistant":"Офлайн-помощник",
    "Use your personal crew login credentials. Account access is managed locally.":"Используйте личные данные для входа. Доступ управляется локально.",
    "Welcome back, astronaut.":"С возвращением, астронавт.",
    "Username":"Имя пользователя",
    "Password":"Пароль",
    "Access my health dashboard →":"Открыть панель здоровья →",
    "Crew profile":"Профиль экипажа",
    "Wearable records":"Записи часов",
    "Today's readings":"Сегодняшние показатели",
    "Record readings":"Записать показатели",
    "Save food log":"Сохранить питание",
    "Medical timeline":"Медицинская история",
    "Change password":"Сменить пароль",
    "Identity card":"Личная карточка",
    "New password":"Новый пароль",
    "Log out":"Выйти",
    "Daily notes":"Заметки за день",
    "No incidents recorded.":"Происшествий нет.",
    "View emergency details":"Открыть экстренные данные",
    "All times (not directly comparable)":"Все периоды (не сопоставимы)",
    "Source":"Источник",
    "Measured":"Измерено",
    "Local crew health records":"Локальные медицинские записи экипажа",
    "Research & data notes ↗":"Исследования и источники ↗",
    "Possible emergency?":"Экстренная ситуация?",
    "For urgent symptoms, follow mission protocol":"При срочных симптомах следуйте протоколу миссии",
    "Sign in to see emergency medical details.":"Войдите для просмотра экстренных данных.",
    "Medical staff only":"Только для медслужбы"
  });
  Object.assign(dictionary.mk,{
    'Quick AI':'Брз AI','General questions. No private health data is shared.':'Општи прашања. Приватните здравствени записи не се споделуваат.',
    'Ask Quick AI':'Прашај брз AI','Mode':'Режим','Offline answers':'Офлајн одговори','Your question':'Твоето прашање',
    'Connected AI (requires API credits)':'Поврзан AI (потребни се кредити)',
    'View emergency card':'Отвори итна картичка','Verified details for any astronaut':'Потврдени податоци за астронаут',
    'Notify the crew and medical team dashboard':'Извести го екипажот и медицинскиот тим',
    'Incident announcements':'Известувања за инциденти','Active emergency reports':'Активни итни пријави',
    'No active emergency reports':'Нема активни итни пријави'
  });
  Object.assign(dictionary.fr,{
    'Quick AI':'IA rapide','General questions. No private health data is shared.':'Questions générales. Aucune donnée médicale privée transmise.',
    'Ask Quick AI':'Demander à l’IA','Mode':'Mode','Offline answers':'Réponses hors ligne','Your question':'Votre question',
    'Connected AI (requires API credits)':'IA connectée (crédits API requis)',
    'View emergency card':"Voir la fiche d'urgence",'Verified details for any astronaut':'Informations vérifiées de l’astronaute',
    'Notify the crew and medical team dashboard':'Avertir l’équipage et le service médical',
    'Incident announcements':'Annonces d’incidents','Active emergency reports':'Urgences en cours',
    'No active emergency reports':'Aucune urgence en cours'
  });
  window.OrbitLifeDictionary=dictionary;
  const tr=s=>dictionary[locale]?.[s]||s;
  const originalTexts=new WeakMap();
  function localize(){
    document.documentElement.lang=locale;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;while(node=walker.nextNode()){
      if(node.parentElement?.closest('script,style,code,pre,textarea,.ol-raw-data'))continue;
      const english=originalTexts.get(node)||node.textContent.trim();
      if(!english || (!dictionary.mk[english] && !dictionary.fr[english] && !dictionary.ru[english]))continue;
      if(!originalTexts.has(node))originalTexts.set(node,english);
      const original=node.textContent, prefix=original.match(/^\s*/)?.[0]||'', suffix=original.match(/\s*$/)?.[0]||'';
      const replacement=prefix+tr(english)+suffix;
      if(original!==replacement)node.textContent=replacement;
    }
    const placeholders={'Search name or ID...':{mk:'Пребарај име или ID...',fr:'Rechercher nom ou ID...'},
      'Earth looks incredible today.':{mk:'Земјата изгледа прекрасно денес.',fr:'La Terre est incroyable aujourd’hui.'},
      'What happened? What help is needed?':{mk:'Што се случи? Каква помош е потребна?',fr:"Que s'est-il passé ? Quelle aide faut-il ?"},
      'Module, airlock or other location':{mk:'Модул, воздушна комора или друга локација',fr:'Module, sas ou autre lieu'}};
    Object.assign(placeholders,{
      'Search name or ID...':{...placeholders['Search name or ID...'],ru:'Поиск по имени или ID...'},
      'Earth looks incredible today.':{...placeholders['Earth looks incredible today.'],ru:'Земля сегодня прекрасна.'},
      'What happened? What help is needed?':{...placeholders['What happened? What help is needed?'],ru:'Что произошло? Какая помощь нужна?'},
      'Module, airlock or other location':{...placeholders['Module, airlock or other location'],ru:'Модуль, шлюз или другое место'}
    });
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(e=>{
      const eng=e.dataset.originalPlaceholder||e.getAttribute('placeholder');e.dataset.originalPlaceholder=eng;
      if(placeholders[eng])e.setAttribute('placeholder',placeholders[eng][locale]||eng);
    });
  }
  const originalFlash=flash;
  flash=function(message,error=false){
    let translated=tr(message);
    if(locale==='mk' && message.startsWith('Logged in as '))translated='Најавен како '+message.slice(13);
    if(locale==='fr' && message.startsWith('Logged in as '))translated='Connecté en tant que '+message.slice(13);
    if(locale==='ru' && message.startsWith('Logged in as '))translated='Вы вошли как '+message.slice(13);
    return originalFlash(translated,error);
  };
  const toast=(message,error=false)=>flash(message,error);
  const currentId=()=>state.target||state.me?.user.astronaut_id;
  const crewInfo=id=>state.crew.find(x=>x.astronaut_id===id)||{name:id,astronaut_id:id};
  const medical=()=>!!(state.me && (state.me.admin||state.me.user.astronaut_id==='AST-003'));
  function applyAccountPrefs(){
    const u=state.me?.user;
    locale=['en','mk','fr','ru'].includes(u?.language)?u.language:'en';
    const theme=['dark','light','system'].includes(u?.theme)?u.theme:'system';
    const effective=theme==='system' ? (window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark') : theme;
    document.body.dataset.olTheme=effective;
    document.documentElement.style.setProperty('--cyan',u?.accent||'#13C8E7');
    const form=q('olPreferencesForm');
    if(form){q('olLanguage').value=locale;q('olTheme').value=theme;q('olAccent').value=u?.accent||'#13C8E7';
      q('olStatusText').value=u?.status_text||'';q('olShowStatus').checked=!!(u?.status_visible??true);}
    localize();
    window.dispatchEvent(new Event('orbitlife:locale-changed'));
  }
  const prevUpdateAuth=updateAuth;
  updateAuth=function(...args){const x=prevUpdateAuth(...args);applyAccountPrefs();return x;};
  const prevRenderCrew=renderCrew;
  renderCrew=function(...args){const x=prevRenderCrew(...args);
    document.querySelectorAll('.crew-card').forEach(card=>{
      const id=card.dataset.inspectAstro, c=crewInfo(id);
      if(c.status_text){const slot=document.createElement('p');slot.className='ol-crew-status ol-raw-data';slot.textContent='“'+c.status_text+'”';
        card.querySelector('.crew-top')?.after(slot);}
    });
    localize();return x;
  };
  const prevGoto=goto;
  goto=function(view){const result=prevGoto(view);if(view==='cortisol'&&state.me){if(!cortisolAstro)cortisolAstro=currentId();refreshCortisol().catch(e=>toast(e.message,true));}
    localize();return result;};
  const prevLoadProfile=loadProfile;
  loadProfile=async function(...args){const result=await prevLoadProfile(...args);await Promise.allSettled([renderEmergencySummary(),refreshTimeline()]);localize();return result;};
  const prevReloadCrew=reloadCrew;
  reloadCrew=async function(...args){const x=await prevReloadCrew(...args);await refreshIncidents();localize();return x;};
  function showOverlay(visible){q('olEmergencyOverlay').classList.toggle('hidden',!visible);
    if(visible){q('olEmergencyClose').focus();}else{q('olEmergencyFab').focus();}}
  function setPane(name){q('olEmergencyPicker').classList.toggle('hidden',name!=='picker');
    q('olEmergencyCard').classList.toggle('hidden',name!=='card');
    q('olIncidentPane').classList.toggle('hidden',name!=='incident');
    q('olBackToEmergency').classList.toggle('hidden',name!=='incident');
    q('olOpenIncident').classList.toggle('hidden',name==='incident');
    q('olSwitchAstronaut').classList.toggle('hidden',name==='picker');}
  function renderPicker(){emergencyTarget=null;emergencyCard=null;q('olEmergencyHeading').textContent=tr('Emergency access');
    q('olEmergencyCrew').innerHTML=state.crew.map(c=>`<button class="ol-picker-member" type="button" data-ol-emergency-id="${html(c.astronaut_id)}"><img src="${html(portrait(c.astronaut_id))}" alt=""><b>${html(c.name)}</b><small>${html(c.astronaut_id)}</small></button>`).join('');
    setPane('picker');showOverlay(true);}
  async function showCard(id){if(!state.me){showOverlay(false);q('loginModal').classList.remove('hidden');toast('Sign in to view emergency cards.',true);return;}
    const result=await api('/api/emergency-card?astronaut_id='+encodeURIComponent(id));emergencyTarget=id;emergencyCard=result.card;
    q('olEmergencyHeading').textContent=tr('Emergency access');
    const c=emergencyCard;
    const fictional=c.source==='scenario';
    const rows=[['Official name',c.name],[fictional?'Allergies (fictional scenario)':'Verified allergies',c.allergies],[fictional?'Conditions (fictional scenario)':'Verified conditions',c.conditions],
      [fictional?'Medications (fictional scenario)':'Relevant verified medications',c.medications],[fictional?'Response notes (fictional scenario)':'Approved emergency instructions',c.instructions],
      ['Crew medical contact',c.medical_contact],['Last verified',fictional?'Not clinically verified':c.last_verified?new Date(c.last_verified).toLocaleString(locale==='mk'?'mk-MK':locale==='fr'?'fr-FR':locale==='ru'?'ru-RU':'en-GB'):tr('Unknown')]];
    q('olEmergencyCard').innerHTML=`${fictional?'<p class="ol-scenario-note">Training scenario: fictional medical information. Not clinician-verified.</p>':''}<div class="ol-card-identity"><img src="${html(c.avatar_url)}" alt=""><div><h3>${html(c.name)}</h3><p>${html(c.astronaut_id)} · ${html(c.role)}</p>${c.critical?'<strong class="ol-critical">CRITICAL CONDITION</strong>':''}</div></div>
      <div class="ol-card-grid">${rows.map(([label,value])=>`<div class="ol-medical-item"><small>${html(tr(label))}</small><strong class="${fictional?'ol-training-data':'ol-raw-data'}">${html(value==='Unknown'?tr('Unknown'):value)}</strong></div>`).join('')}</div>
      <p class="ol-verify-note">${fictional?'Fictional crew dataset · not approved medical instructions':c.last_verified?html(tr('Verified by'))+' '+html(c.verified_by||tr('Unknown')):html(tr('Unknown'))+' · '+html(tr('Medical staff only'))}</p>`;
    setPane('card');showOverlay(true);}
  function launchEmergency(){if(!state.me){q('loginModal').classList.remove('hidden');toast('Sign in to view emergency cards.',true);return;}
    const activeModal=!q('crewInspectModal').classList.contains('hidden');
    const id=activeModal?state.crewInspect:((state.view==='personal'||state.view==='crewprofile'||state.view==='emergency')?currentId():null);
    if(id)showCard(id).catch(e=>toast(e.message,true));else renderPicker();}
  function incidentForm(id){const idToUse=id||state.me?.user.astronaut_id||state.crew[0]?.astronaut_id;
    q('olIncidentAstronaut').innerHTML=state.crew.map(c=>`<option value="${c.astronaut_id}">${html(c.name)}</option>`).join('');
    q('olIncidentAstronaut').value=idToUse;
    q('olIncidentResult').innerHTML='';setPane('incident');showOverlay(true);}
  async function uploadIncidentPhoto(incidentId,file){if(file.size>5*1024*1024)throw new Error('Photo must be smaller than 5 MB.');
    const res=await fetch('/api/incident-photo/'+incidentId,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
    let payload;try{payload=await res.json();}catch(_){payload={};}
    if(!res.ok)throw new Error(payload.error||'Photo upload failed.');return payload;}
  function savedIncidentUI(incidentId,photoPending,message){
    q('olIncidentResult').innerHTML=`<div class="ol-save-success"><strong>${html(tr('Saved incident'))} #${incidentId}</strong><p class="ol-raw-data">${html(message)}</p>${photoPending?`<button class="button secondary" type="button" id="olRetrySavedPhoto">${html(tr('Retry photo'))}</button>`:''}</div>`;
    q('olRetrySavedPhoto')?.addEventListener('click',async()=>{const photo=lastFile||q('olIncidentPhoto').files?.[0];
      if(!photo){q('olIncidentPhoto').click();toast('Choose a photo then press Retry photo.',true);return;}
      try{await uploadIncidentPhoto(incidentId,photo);savedIncidentUI(incidentId,false,tr('Photo uploaded'));await refreshIncidents();await refreshTimeline();}
      catch(e){toast(e.message,true);}});
  }
  async function refreshIncidents(){if(!state.me){incidents=[];q('olActiveIncidents').classList.add('hidden');return;}
    const result=await api('/api/incidents');incidents=result.incidents||[];
    const active=incidents.filter(x=>x.status==='active');
    q('olActiveIncidents').classList.remove('hidden');
    q('olActiveIncidents').innerHTML=active.length?`<section class="ol-announcement-board"><div class="ol-announcement-header"><div><span class="ol-announcement-label">● ${html(tr('Incident announcements'))}</span><h3>${html(tr('Active emergency reports'))} <span class="ol-alert-count">${active.length}</span></h3><p>${html(tr('Crew-submitted reports. Select a report to view the astronaut’s verified emergency details.'))}</p></div><button type="button" id="olNewIncidentBoard" class="button warning">＋ ${html(tr('Report an emergency'))}</button></div><div class="ol-incident-items">${active.slice(0,6).map(renderIncidentRow).join('')}</div></section>`:`<div class="ol-announcement-empty"><span class="ol-green-indicator"></span>${html(tr('No active emergency reports'))}<button type="button" id="olNewIncidentBoard" class="button secondary">＋ ${html(tr('Report an emergency'))}</button></div>`;
    q('olNewIncidentBoard')?.addEventListener('click',()=>incidentForm(null));
    q('olActiveIncidents').querySelectorAll('[data-ol-inc-card]').forEach(btn=>btn.addEventListener('click',()=>showCard(btn.dataset.olIncCard).catch(e=>toast(e.message,true))));
    q('olActiveIncidents').querySelectorAll('[data-ol-inc-resolve]').forEach(btn=>btn.addEventListener('click',()=>markResolved(Number(btn.dataset.olIncResolve))));
    q('olActiveIncidents').querySelectorAll('[data-ol-inc-retry]').forEach(btn=>btn.addEventListener('change',e=>retryFromList(Number(btn.dataset.olIncRetry),e.target.files?.[0])));
    window.dispatchEvent(new CustomEvent('orbitlife:incidents',{detail:{incidents}}));
  }
  function renderIncidentRow(x){const canResolve=medical();const canRetry=(state.me?.user.astronaut_id===crewInfo(x.astronaut_id)?.astronaut_id &&
      state.me?.user.name===x.reported_by_name)||canResolve;
    return `<article class="ol-incident"><div><span class="ol-priority ${html(x.urgency)}">${html(x.urgency.toUpperCase())}</span> <b>${html(crewInfo(x.astronaut_id).name)}</b> <small>#${x.id} · ${html(x.created_at)}</small></div>
      <p class="ol-raw-data">${html(x.location)} · ${html(x.description)}</p><small>${html(tr('Reported by'))}: ${html(x.reported_by_name)}</small>
      <div class="ol-incident-actions"><button type="button" class="button secondary" data-ol-inc-card="${html(x.astronaut_id)}">${html(tr('Open emergency card'))}</button>
      ${x.has_photo?`<img loading="lazy" class="ol-incident-photo" src="${html(x.photo_url)}" alt="Incident photo">`:(canRetry&&x.photo_status==='pending'?`<label class="ol-small-upload">${html(tr('Retry photo'))}<input type="file" accept="image/*" data-ol-inc-retry="${x.id}"></label>`:'')}
      ${canResolve?`<button type="button" class="button secondary" data-ol-inc-resolve="${x.id}">${html(tr('Mark resolved'))}</button>`:''}</div></article>`;
  }
  async function retryFromList(id,file){if(!file)return;try{await uploadIncidentPhoto(id,file);toast('Photo uploaded');await refreshIncidents();await refreshTimeline();}
    catch(e){toast(e.message,true);}}
  async function markResolved(id){try{await api('/api/incident-status','POST',{id,status:'resolved'});toast('Incident resolved');await refreshIncidents();await refreshTimeline();}
    catch(e){toast(e.message,true);}}
  async function refreshTimeline(){if(!state.me||!state.target)return;
    const id=state.target;let list=incidents.filter(x=>x.astronaut_id===id);
    if(!incidents.length){const d=await api('/api/incidents?astronaut_id='+encodeURIComponent(id));list=d.incidents||[];}
    if(state.target!==id)return;
    q('olTimelineList').innerHTML=list.length?list.slice(0,10).map(x=>`<div class="ol-timeline-event"><span class="ol-priority ${html(x.urgency)}">${html(x.urgency)}</span><div><strong>${html(x.location)}</strong><p class="ol-raw-data">${html(x.description)}</p><small>${html(x.created_at)} · ${html(x.reported_by_name)} · ${html(x.status)}</small></div></div>`).join(''):`<p>${html(tr('No incidents recorded.'))}</p>`;
  }
  async function renderEmergencySummary(){if(!state.me||!state.target)return;
    const id=state.target;const card=(await api('/api/emergency-card?astronaut_id='+encodeURIComponent(id))).card;
    if(state.target!==id)return;
    q('olPersonalEmergency').innerHTML=`<div class="ol-profile-emergency"><div><span class="ol-kicker">${html(tr('Profile emergency summary'))}</span>
      <strong>${html(card.critical?'CRITICAL CONDITION':tr('Emergency access'))}</strong><small>${html(tr('Allergies'))}: <b>${html(card.allergies==='Unknown'?tr('Unknown'):card.allergies)}</b> · ${html(tr('Medical contact'))}: <b>${html(card.medical_contact==='Unknown'?tr('Unknown'):card.medical_contact)}</b></small></div>
      <button class="button warning" type="button" id="olPersonalEmergencyOpen">${html(tr('View emergency details'))}</button></div>`;
    q('olPersonalEmergencyOpen').addEventListener('click',()=>showCard(id).catch(e=>toast(e.message,true)));
  }
  async function refreshCortisol(){if(!state.me)return;const id=cortisolAstro||currentId();
    if(!id)return;const res=await api('/api/cortisol?astronaut_id='+encodeURIComponent(id));
    if(id!==cortisolAstro)return;cortisol=res.records||[];
    q('olCortisolAstro').textContent=id;
    q('olCortisolEditor').classList.toggle('hidden',!res.medical_editor);
    q('olCortisolTarget').innerHTML=state.crew.map(c=>`<option value="${html(c.astronaut_id)}">${html(c.name)}</option>`).join('');
    q('olCortisolTarget').value=id;
    renderCortisol();}
  function renderCortisol(){
    const group=q('olCortisolWindow').value, units=q('olCortisolUnits').value;
    let filtered=cortisol.filter(r=>r.units===units && (group==='all'||(group==='0-60'&&r.since_waking_min!==null&&r.since_waking_min<=60)||
      (group==='61-120'&&r.since_waking_min!==null&&r.since_waking_min>60&&r.since_waking_min<=120)||
      (group==='121-240'&&r.since_waking_min!==null&&r.since_waking_min>120&&r.since_waking_min<=240)||
      (group==='241-480'&&r.since_waking_min!==null&&r.since_waking_min>240&&r.since_waking_min<=480)||
      (group==='481-1440'&&r.since_waking_min!==null&&r.since_waking_min>480)||
      (group==='unknown'&&r.since_waking_min===null)));
    filtered.sort((a,b)=>a.collected_at.localeCompare(b.collected_at));
    const display=filtered.slice(-20), max=Math.max(1,...display.map(x=>x.result))*1.2;
    q('olCortisolChart').innerHTML=display.length?`<div class="ol-cortisol-bars">${display.map(r=>`<div class="ol-cortisol-point" title="${html(r.collected_at)} · ${r.result} ${html(r.units)}"><span>${html(r.result)}</span><i class="${r.simulated?'is-simulated':''}" style="height:${Math.max(4,Math.round(r.result/max*130))}px"></i><small>${html(r.collected_at.slice(5,10))}</small></div>`).join('')}</div>`:`<p>${html(tr('No results yet.'))}</p>`;
    q('olCortisolRecords').innerHTML=cortisol.length?cortisol.map(r=>{
      const flagged=!!(!r.simulated&&r.reference_low!==null&&r.reference_high!==null&&(r.result<r.reference_low||r.result>r.reference_high));
      return `<div class="ol-cortisol-entry"><div class="record-head"><strong>${html(r.result)} ${html(r.units)}</strong><span class="ol-priority ${r.simulated?'simulation':flagged?'high':'normal'}">${html(tr(r.simulated?'Simulated':flagged?'Medical review':'Lab measured'))}</span></div>
        <small>${html(r.collected_at)} · ${r.since_waking_min===null?html(tr('Unknown')):r.since_waking_min+' min after waking'} · ${html(r.source)}</small>
        <p class="ol-raw-data">${html(r.source_detail||'')} ${r.reference_low!==null?`· Lab range: ${r.reference_low}–${r.reference_high} ${html(r.units)}`:''}</p></div>`;}).join(''):`<p>${html(tr('No results yet.'))}</p>`;
  }
  function switchAstronautCortisol(id){cortisolAstro=id;refreshCortisol().catch(e=>toast(e.message,true));}
  function setOwnerStatus(){const l=q('olCortisolEditor');if(!state.me)l.classList.add('hidden');}
  async function startExtras(){
    window.OrbitLifeEmergency={open:launchEmergency,showCard,report:incidentForm,picker:renderPicker,refresh:refreshIncidents};
    q('olEmergencyViewChoice').addEventListener('click',()=>renderPicker());
    q('olEmergencyReportChoice').addEventListener('click',()=>incidentForm(emergencyTarget));
    q('olEmergencyFab').addEventListener('click',launchEmergency);
    q('olEmergencyClose').addEventListener('click',()=>showOverlay(false));
    q('olEmergencyOverlay').addEventListener('click',e=>{if(e.target===q('olEmergencyOverlay'))showOverlay(false);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!q('olEmergencyOverlay').classList.contains('hidden')){e.preventDefault();showOverlay(false);}});
    setInterval(()=>{if(state.me&&document.visibilityState==='visible')refreshIncidents().catch(()=>{});},16000);
    q('olEmergencyCrew').addEventListener('click',e=>{const b=e.target.closest('[data-ol-emergency-id]');if(b)showCard(b.dataset.olEmergencyId).catch(err=>toast(err.message,true));});
    q('olSwitchAstronaut').addEventListener('click',renderPicker);
    q('olOpenIncident').addEventListener('click',()=>incidentForm(emergencyTarget));
    q('olBackToEmergency').addEventListener('click',()=>emergencyTarget?showCard(emergencyTarget):renderPicker());
    q('olIncidentForm').addEventListener('submit',async e=>{e.preventDefault();if(!state.me)return;
      const form=e.currentTarget, data=Object.fromEntries(new FormData(form).entries());
      const file=q('olIncidentPhoto').files?.[0];delete data.photo;
      if(file&&file.size>5*1024*1024){toast('Photo must be smaller than 5 MB.',true);return;}
      const submit=q('olSubmitIncident');submit.disabled=true;
      try{const saved=await api('/api/incidents','POST',{...data,photo_expected:!!file});
        lastIncidentId=saved.incident_id;lastFile=file||null;
        window.OrbitLifeAlertsRefresh?.();
        savedIncidentUI(saved.incident_id,!!file,'Report saved at '+new Date().toLocaleString());
        await refreshIncidents();if(state.target===data.astronaut_id)await refreshTimeline();
        if(file){try{await uploadIncidentPhoto(saved.incident_id,file);savedIncidentUI(saved.incident_id,false,tr('Photo uploaded'));await refreshIncidents();}
          catch(err){savedIncidentUI(saved.incident_id,true,'Report saved. Photo upload failed: '+err.message);toast(err.message,true);}}
        form.reset();q('olIncidentAstronaut').value=data.astronaut_id;
      }catch(err){toast(err.message,true);}finally{submit.disabled=false;}
    });
    q('olPreferencesForm').addEventListener('submit',async e=>{e.preventDefault();try{const payload={...Object.fromEntries(new FormData(e.currentTarget).entries()),status_visible:q('olShowStatus').checked};
      const result=await api('/api/personal-preferences','POST',payload);
      Object.assign(state.me.user,result.preferences);applyAccountPrefs();await reloadCrew();toast('Preferences saved');}
      catch(err){toast(err.message,true);}});
    q('olUploadAvatar').addEventListener('click',async()=>{const file=q('olAvatarFile').files?.[0];if(!file){toast('Choose an image first',true);return;}
      if(file.size>5*1024*1024){toast('Photo must be smaller than 5 MB.',true);return;}
      try{const res=await fetch('/api/profile-avatar',{method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream'}});
        const reply=await res.json();if(!res.ok)throw new Error(reply.error||'Image upload failed.');
        avatarOverrides[state.me.user.astronaut_id]=reply.avatar_url;
        await reloadCrew();updateAuth();if(state.profile)renderPersonal();toast('Profile photo saved');}
      catch(e){toast(e.message,true);}});
    q('olVerifyForm').addEventListener('submit',async e=>{e.preventDefault();try{const saved=await api('/api/emergency-verify','POST',Object.fromEntries(new FormData(e.currentTarget).entries()));
      toast('Medical verification saved');if(emergencyTarget===saved.card.astronaut_id)await showCard(emergencyTarget);
      if(state.target===saved.card.astronaut_id)await renderEmergencySummary();}
      catch(err){toast(err.message,true);}});
    q('olCortisolWindow').addEventListener('change',renderCortisol);q('olCortisolUnits').addEventListener('change',renderCortisol);
    q('olCortisolTarget').addEventListener('change',e=>switchAstronautCortisol(e.target.value));
    q('olCortisolForm').addEventListener('submit',async e=>{e.preventDefault();try{
      const data=Object.fromEntries(new FormData(e.currentTarget).entries());delete data.local_timestamp;
      const date=q('olCortisolDate').value;if(!date)throw new Error('Enter a collection time.');
      data.collected_at=new Date(date).toISOString();data.astronaut_id=q('olCortisolTarget').value;
      await api('/api/cortisol','POST',data);toast('Cortisol result saved');await refreshCortisol();}
      catch(err){toast(err.message,true);}});
    window.matchMedia('(prefers-color-scheme:light)').addEventListener?.('change',()=>{if(state.me?.user.theme==='system')applyAccountPrefs();});
    localize();
    // Once the legacy app finishes signing in, these hooks update settings and current records.
    if(state.me){applyAccountPrefs();await refreshIncidents();await renderEmergencySummary();}
    else applyAccountPrefs();
  }
  const updateWithUser=async()=>{
    q('olVerifyPanel').classList.toggle('hidden',!medical());
    if(medical()){
      q('olVerifyAstronaut').innerHTML=state.crew.map(c=>`<option value="${c.astronaut_id}">${html(c.name)}</option>`).join('');
      q('olVerifyAstronaut').value=currentId()||'AST-001';
      if(!q('olCortisolDate').value){const d=new Date();q('olCortisolDate').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    }
    setOwnerStatus();
  };
  const realUpdateAuth=updateAuth;
  updateAuth=function(...args){const v=realUpdateAuth(...args);updateWithUser().catch(e=>console.error('PulseDeck prefs',e));return v;};
  const reloadOriginal=reloadCrew;
  reloadCrew=async function(...args){const res=await reloadOriginal(...args);await updateWithUser();return res;};
  const ldr=loadProfile;
  loadProfile=async function(...args){const result=await ldr(...args);await updateWithUser();return result;};
  document.addEventListener('DOMContentLoaded',startExtras,{once:true});
})();
