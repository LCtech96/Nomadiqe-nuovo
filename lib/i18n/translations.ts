export type Locale = 'it' | 'en' | 'ru' | 'fr' | 'de'

export const locales: Locale[] = ['it', 'en', 'ru', 'fr', 'de']

export const localeNames: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  ru: 'Русский',
  fr: 'Français',
  de: 'Deutsch',
}

export const translations: Record<Locale, Record<string, string>> = {
  it: {
    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Esplora',
    'nav.dashboard': 'Dashboard',
    'nav.kolBed': 'KOL&BED',
    'nav.profile': 'Profilo',
    'nav.messages': 'Messaggi',
    'nav.notifications': 'Notifiche',
    'nav.settings': 'Impostazioni',
    'nav.logout': 'Esci',
    'nav.login': 'Accedi',
    'nav.signup': 'Registrati',
    'nav.menu': 'Menu',
    
    // Common
    'common.loading': 'Caricamento...',
    'common.error': 'Errore',
    'common.success': 'Successo',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.delete': 'Elimina',
    'common.edit': 'Modifica',
    'common.close': 'Chiudi',
    'common.back': 'Indietro',
    'common.next': 'Avanti',
    'common.search': 'Cerca',
    'common.filter': 'Filtra',
    'common.all': 'Tutti',
    'common.yes': 'Sì',
    'common.no': 'No',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Conferma Password',
    'auth.forgotPassword': 'Password dimenticata?',
    'auth.rememberMe': 'Ricordami',
    'auth.signIn': 'Accedi',
    'auth.signUp': 'Registrati',
    'auth.signOut': 'Esci',
    'auth.alreadyAccount': 'Hai già un account?',
    'auth.noAccount': 'Non hai un account?',
    'auth.createAccount': 'Crea un account',
    'auth.verifyEmail': 'Verifica Email',
    'auth.verifyCode': 'Inserisci il codice a 6 cifre inviato alla tua email',
    'auth.resendCode': 'Rinvia il codice',
    'auth.codeSent': 'Codice inviato!',
    
    // Profile
    'profile.title': 'Profilo',
    'profile.edit': 'Modifica Profilo',
    'profile.name': 'Nome',
    'profile.username': 'Username',
    'profile.email': 'Email',
    'profile.phone': 'Telefono',
    'profile.bio': 'Biografia',
    'profile.save': 'Salva Modifiche',
    'profile.avatar': 'Foto Profilo',
    
    // Messages
    'messages.title': 'Messaggi',
    'messages.noMessages': 'Nessun messaggio',
    'messages.send': 'Invia',
    'messages.typeMessage': 'Scrivi un messaggio...',
    'messages.newMessage': 'Nuovo messaggio',
    
    // Notifications
    'notifications.title': 'Notifiche',
    'notifications.noNotifications': 'Nessuna notifica',
    'notifications.markRead': 'Segna come letto',
    'notifications.enablePush': 'Attiva notifiche push',
    'notifications.enabling': 'Attivazione in corso...',
    
    // Waitlist
    'waitlist.title': 'Unisciti alla Waitlist Esclusiva Nomadiqe',
    'waitlist.description': 'Fai parte di qualcosa di straordinario. Unisciti a migliaia di persone che stanno già ottenendo l\'accesso anticipato alla nostra piattaforma rivoluzionaria.',
    'waitlist.email': 'Inserisci la tua email',
    'waitlist.phone': 'Numero di cellulare',
    'waitlist.role': 'Seleziona il tuo ruolo',
    'waitlist.traveler': 'Traveler',
    'waitlist.host': 'Host',
    'waitlist.creator': 'Creator',
    'waitlist.jolly': 'Jolly',
    'waitlist.submit': 'Iscriviti',
    'waitlist.submitting': 'Invio...',
    'waitlist.success': 'Richiesta inviata',
    'waitlist.successMessage': 'Grazie! Ti contatteremo via email.',
    'waitlist.approved': 'La tua email è già approvata! Completa la registrazione per accedere.',
    'waitlist.completeRegistration': 'Completa la registrazione',
    'waitlist.alreadyRegistered': 'La tua email è già approvata e hai già completato la registrazione!',
    'waitlist.signIn': 'Accedi',
    
    // Roles
    'role.traveler': 'Traveler',
    'role.host': 'Host',
    'role.creator': 'Creator',
    'role.jolly': 'Jolly',
    'role.jolly': 'Jolly',
    
    // Errors
    'error.generic': 'Si è verificato un errore',
    'error.network': 'Errore di connessione',
    'error.notFound': 'Non trovato',
    'error.unauthorized': 'Non autorizzato',
    'error.forbidden': 'Accesso negato',
    
    // Language
    'language.title': 'Lingua',
    'language.select': 'Seleziona lingua',
    
    // Theme
    'theme.light': 'Chiaro',
    'theme.dark': 'Scuro',
    'theme.system': 'Sistema',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.dashboard': 'Dashboard',
    'nav.kolBed': 'KOL&BED',
    'nav.profile': 'Profile',
    'nav.messages': 'Messages',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.menu': 'Menu',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
    'auth.alreadyAccount': 'Already have an account?',
    'auth.noAccount': "Don't have an account?",
    'auth.createAccount': 'Create Account',
    'auth.verifyEmail': 'Verify Email',
    'auth.verifyCode': 'Enter the 6-digit code sent to your email',
    'auth.resendCode': 'Resend Code',
    'auth.codeSent': 'Code sent!',
    
    // Profile
    'profile.title': 'Profile',
    'profile.edit': 'Edit Profile',
    'profile.name': 'Name',
    'profile.username': 'Username',
    'profile.email': 'Email',
    'profile.phone': 'Phone',
    'profile.bio': 'Bio',
    'profile.save': 'Save Changes',
    'profile.avatar': 'Profile Picture',
    
    // Messages
    'messages.title': 'Messages',
    'messages.noMessages': 'No messages',
    'messages.send': 'Send',
    'messages.typeMessage': 'Type a message...',
    'messages.newMessage': 'New message',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.noNotifications': 'No notifications',
    'notifications.markRead': 'Mark as read',
    'notifications.enablePush': 'Enable push notifications',
    'notifications.enabling': 'Enabling...',
    
    // Waitlist
    'waitlist.title': 'Join Nomadiqe Exclusive Waitlist',
    'waitlist.description': 'Be part of something extraordinary. Join thousands of people already getting early access to our revolutionary platform.',
    'waitlist.email': 'Enter your email',
    'waitlist.phone': 'Phone number',
    'waitlist.role': 'Select your role',
    'waitlist.traveler': 'Traveler',
    'waitlist.host': 'Host',
    'waitlist.creator': 'Creator',
    'waitlist.jolly': 'Jolly',
    'waitlist.submit': 'Subscribe',
    'waitlist.submitting': 'Submitting...',
    'waitlist.success': 'Request sent',
    'waitlist.successMessage': 'Thank you! We will contact you via email.',
    'waitlist.approved': 'Your email is already approved! Complete registration to access.',
    'waitlist.completeRegistration': 'Complete registration',
    'waitlist.alreadyRegistered': 'Your email is already approved and you have completed registration!',
    'waitlist.signIn': 'Sign In',
    
    // Roles
    'role.traveler': 'Traveler',
    'role.host': 'Host',
    'role.creator': 'Creator',
    'role.jolly': 'Jolly',
    'role.jolly': 'Jolly',
    
    // Errors
    'error.generic': 'An error occurred',
    'error.network': 'Connection error',
    'error.notFound': 'Not found',
    'error.unauthorized': 'Unauthorized',
    'error.forbidden': 'Access denied',
    
    // Language
    'language.title': 'Language',
    'language.select': 'Select language',
    
    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
  },
  ru: {
    // Navigation
    'nav.home': 'Главная',
    'nav.explore': 'Исследовать',
    'nav.dashboard': 'Панель',
    'nav.kolBed': 'KOL&BED',
    'nav.profile': 'Профиль',
    'nav.messages': 'Сообщения',
    'nav.notifications': 'Уведомления',
    'nav.settings': 'Настройки',
    'nav.logout': 'Выход',
    'nav.login': 'Войти',
    'nav.signup': 'Регистрация',
    'nav.menu': 'Меню',
    
    // Common
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успех',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.close': 'Закрыть',
    'common.back': 'Назад',
    'common.next': 'Далее',
    'common.search': 'Поиск',
    'common.filter': 'Фильтр',
    'common.all': 'Все',
    'common.yes': 'Да',
    'common.no': 'Нет',
    
    // Auth
    'auth.email': 'Эл. почта',
    'auth.password': 'Пароль',
    'auth.confirmPassword': 'Подтвердите пароль',
    'auth.forgotPassword': 'Забыли пароль?',
    'auth.rememberMe': 'Запомнить меня',
    'auth.signIn': 'Войти',
    'auth.signUp': 'Регистрация',
    'auth.signOut': 'Выход',
    'auth.alreadyAccount': 'Уже есть аккаунт?',
    'auth.noAccount': 'Нет аккаунта?',
    'auth.createAccount': 'Создать аккаунт',
    'auth.verifyEmail': 'Подтвердить Email',
    'auth.verifyCode': 'Введите 6-значный код, отправленный на вашу почту',
    'auth.resendCode': 'Отправить код повторно',
    'auth.codeSent': 'Код отправлен!',
    
    // Profile
    'profile.title': 'Профиль',
    'profile.edit': 'Редактировать профиль',
    'profile.name': 'Имя',
    'profile.username': 'Имя пользователя',
    'profile.email': 'Эл. почта',
    'profile.phone': 'Телефон',
    'profile.bio': 'Биография',
    'profile.save': 'Сохранить изменения',
    'profile.avatar': 'Фото профиля',
    
    // Messages
    'messages.title': 'Сообщения',
    'messages.noMessages': 'Нет сообщений',
    'messages.send': 'Отправить',
    'messages.typeMessage': 'Напишите сообщение...',
    'messages.newMessage': 'Новое сообщение',
    
    // Notifications
    'notifications.title': 'Уведомления',
    'notifications.noNotifications': 'Нет уведомлений',
    'notifications.markRead': 'Отметить как прочитанное',
    'notifications.enablePush': 'Включить push-уведомления',
    'notifications.enabling': 'Включение...',
    
    // Waitlist
    'waitlist.title': 'Присоединиться к эксклюзивному списку ожидания Nomadiqe',
    'waitlist.description': 'Станьте частью чего-то необыкновенного. Присоединяйтесь к тысячам людей, которые уже получают ранний доступ к нашей революционной платформе.',
    'waitlist.email': 'Введите вашу почту',
    'waitlist.phone': 'Номер телефона',
    'waitlist.role': 'Выберите вашу роль',
    'waitlist.traveler': 'Путешественник',
    'waitlist.host': 'Хост',
    'waitlist.creator': 'Создатель',
    'waitlist.jolly': 'Джокер',
    'waitlist.submit': 'Подписаться',
    'waitlist.submitting': 'Отправка...',
    'waitlist.success': 'Запрос отправлен',
    'waitlist.successMessage': 'Спасибо! Мы свяжемся с вами по электронной почте.',
    'waitlist.approved': 'Ваша почта уже одобрена! Завершите регистрацию для доступа.',
    'waitlist.completeRegistration': 'Завершить регистрацию',
    'waitlist.alreadyRegistered': 'Ваша почта уже одобрена и вы завершили регистрацию!',
    'waitlist.signIn': 'Войти',
    
    // Roles
    'role.traveler': 'Путешественник',
    'role.host': 'Хост',
    'role.creator': 'Создатель',
    'role.jolly': 'Джокер',
    'role.manager': 'Менеджер',
    
    // Errors
    'error.generic': 'Произошла ошибка',
    'error.network': 'Ошибка подключения',
    'error.notFound': 'Не найдено',
    'error.unauthorized': 'Не авторизован',
    'error.forbidden': 'Доступ запрещен',
    
    // Language
    'language.title': 'Язык',
    'language.select': 'Выберите язык',
    
    // Theme
    'theme.light': 'Светлая',
    'theme.dark': 'Темная',
    'theme.system': 'Системная',
  },
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.explore': 'Explorer',
    'nav.dashboard': 'Tableau de bord',
    'nav.kolBed': 'KOL&BED',
    'nav.profile': 'Profil',
    'nav.messages': 'Messages',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    'nav.login': 'Connexion',
    'nav.signup': 'S\'inscrire',
    'nav.menu': 'Menu',
    
    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.all': 'Tous',
    'common.yes': 'Oui',
    'common.no': 'Non',
    
    // Auth
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.rememberMe': 'Se souvenir de moi',
    'auth.signIn': 'Se connecter',
    'auth.signUp': 'S\'inscrire',
    'auth.signOut': 'Se déconnecter',
    'auth.alreadyAccount': 'Vous avez déjà un compte?',
    'auth.noAccount': 'Vous n\'avez pas de compte?',
    'auth.createAccount': 'Créer un compte',
    'auth.verifyEmail': 'Vérifier l\'email',
    'auth.verifyCode': 'Entrez le code à 6 chiffres envoyé à votre email',
    'auth.resendCode': 'Renvoyer le code',
    'auth.codeSent': 'Code envoyé!',
    
    // Profile
    'profile.title': 'Profil',
    'profile.edit': 'Modifier le profil',
    'profile.name': 'Nom',
    'profile.username': 'Nom d\'utilisateur',
    'profile.email': 'Email',
    'profile.phone': 'Téléphone',
    'profile.bio': 'Biographie',
    'profile.save': 'Enregistrer les modifications',
    'profile.avatar': 'Photo de profil',
    
    // Messages
    'messages.title': 'Messages',
    'messages.noMessages': 'Aucun message',
    'messages.send': 'Envoyer',
    'messages.typeMessage': 'Tapez un message...',
    'messages.newMessage': 'Nouveau message',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.noNotifications': 'Aucune notification',
    'notifications.markRead': 'Marquer comme lu',
    'notifications.enablePush': 'Activer les notifications push',
    'notifications.enabling': 'Activation...',
    
    // Waitlist
    'waitlist.title': 'Rejoignez la liste d\'attente exclusive Nomadiqe',
    'waitlist.description': 'Faites partie de quelque chose d\'extraordinaire. Rejoignez des milliers de personnes qui obtiennent déjà un accès anticipé à notre plateforme révolutionnaire.',
    'waitlist.email': 'Entrez votre email',
    'waitlist.phone': 'Numéro de téléphone',
    'waitlist.role': 'Sélectionnez votre rôle',
    'waitlist.traveler': 'Voyageur',
    'waitlist.host': 'Hôte',
    'waitlist.creator': 'Créateur',
    'waitlist.jolly': 'Joker',
    'waitlist.submit': 'S\'inscrire',
    'waitlist.submitting': 'Envoi...',
    'waitlist.success': 'Demande envoyée',
    'waitlist.successMessage': 'Merci! Nous vous contacterons par email.',
    'waitlist.approved': 'Votre email est déjà approuvé! Complétez l\'inscription pour accéder.',
    'waitlist.completeRegistration': 'Compléter l\'inscription',
    'waitlist.alreadyRegistered': 'Votre email est déjà approuvé et vous avez complété l\'inscription!',
    'waitlist.signIn': 'Se connecter',
    
    // Roles
    'role.traveler': 'Voyageur',
    'role.host': 'Hôte',
    'role.creator': 'Créateur',
    'role.jolly': 'Joker',
    'role.jolly': 'Jolly',
    
    // Errors
    'error.generic': 'Une erreur s\'est produite',
    'error.network': 'Erreur de connexion',
    'error.notFound': 'Non trouvé',
    'error.unauthorized': 'Non autorisé',
    'error.forbidden': 'Accès refusé',
    
    // Language
    'language.title': 'Langue',
    'language.select': 'Sélectionner la langue',
    
    // Theme
    'theme.light': 'Clair',
    'theme.dark': 'Sombre',
    'theme.system': 'Système',
  },
  de: {
    // Navigation
    'nav.home': 'Startseite',
    'nav.explore': 'Erkunden',
    'nav.dashboard': 'Dashboard',
    'nav.kolBed': 'KOL&BED',
    'nav.profile': 'Profil',
    'nav.messages': 'Nachrichten',
    'nav.notifications': 'Benachrichtigungen',
    'nav.settings': 'Einstellungen',
    'nav.logout': 'Abmelden',
    'nav.login': 'Anmelden',
    'nav.signup': 'Registrieren',
    'nav.menu': 'Menü',
    
    // Common
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.all': 'Alle',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    
    // Auth
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.rememberMe': 'Angemeldet bleiben',
    'auth.signIn': 'Anmelden',
    'auth.signUp': 'Registrieren',
    'auth.signOut': 'Abmelden',
    'auth.alreadyAccount': 'Bereits ein Konto?',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.createAccount': 'Konto erstellen',
    'auth.verifyEmail': 'E-Mail bestätigen',
    'auth.verifyCode': 'Geben Sie den 6-stelligen Code ein, der an Ihre E-Mail gesendet wurde',
    'auth.resendCode': 'Code erneut senden',
    'auth.codeSent': 'Code gesendet!',
    
    // Profile
    'profile.title': 'Profil',
    'profile.edit': 'Profil bearbeiten',
    'profile.name': 'Name',
    'profile.username': 'Benutzername',
    'profile.email': 'E-Mail',
    'profile.phone': 'Telefon',
    'profile.bio': 'Biografie',
    'profile.save': 'Änderungen speichern',
    'profile.avatar': 'Profilbild',
    
    // Messages
    'messages.title': 'Nachrichten',
    'messages.noMessages': 'Keine Nachrichten',
    'messages.send': 'Senden',
    'messages.typeMessage': 'Nachricht eingeben...',
    'messages.newMessage': 'Neue Nachricht',
    
    // Notifications
    'notifications.title': 'Benachrichtigungen',
    'notifications.noNotifications': 'Keine Benachrichtigungen',
    'notifications.markRead': 'Als gelesen markieren',
    'notifications.enablePush': 'Push-Benachrichtigungen aktivieren',
    'notifications.enabling': 'Aktivierung...',
    
    // Waitlist
    'waitlist.title': 'Treten Sie der exklusiven Nomadiqe-Warteliste bei',
    'waitlist.description': 'Seien Sie Teil von etwas Außergewöhnlichem. Schließen Sie sich Tausenden von Menschen an, die bereits frühen Zugang zu unserer revolutionären Plattform erhalten.',
    'waitlist.email': 'Geben Sie Ihre E-Mail ein',
    'waitlist.phone': 'Telefonnummer',
    'waitlist.role': 'Wählen Sie Ihre Rolle',
    'waitlist.traveler': 'Reisender',
    'waitlist.host': 'Gastgeber',
    'waitlist.creator': 'Schöpfer',
    'waitlist.jolly': 'Joker',
    'waitlist.submit': 'Abonnieren',
    'waitlist.submitting': 'Wird gesendet...',
    'waitlist.success': 'Anfrage gesendet',
    'waitlist.successMessage': 'Vielen Dank! Wir werden Sie per E-Mail kontaktieren.',
    'waitlist.approved': 'Ihre E-Mail ist bereits genehmigt! Schließen Sie die Registrierung ab, um Zugang zu erhalten.',
    'waitlist.completeRegistration': 'Registrierung abschließen',
    'waitlist.alreadyRegistered': 'Ihre E-Mail ist bereits genehmigt und Sie haben die Registrierung abgeschlossen!',
    'waitlist.signIn': 'Anmelden',
    
    // Roles
    'role.traveler': 'Reisender',
    'role.host': 'Gastgeber',
    'role.creator': 'Schöpfer',
    'role.jolly': 'Joker',
    'role.jolly': 'Jolly',
    
    // Errors
    'error.generic': 'Ein Fehler ist aufgetreten',
    'error.network': 'Verbindungsfehler',
    'error.notFound': 'Nicht gefunden',
    'error.unauthorized': 'Nicht autorisiert',
    'error.forbidden': 'Zugriff verweigert',
    
    // Language
    'language.title': 'Sprache',
    'language.select': 'Sprache auswählen',
    
    // Theme
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'theme.system': 'System',
  },
}
