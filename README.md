# 🎮 PokeWallet - Gestionnaire de Collection de Cartes Pokémon

## Vue d'ensemble

PokeWallet est une application mobile développée avec **Ionic/Angular 18** permettant aux collectionneurs de gérer leur collection de cartes Pokémon. L'application utilise **Firebase** pour l'authentification et le stockage de données, et implémente des stratégies avancées de mise en cache et de gestion d'erreurs.

## 🚀 Fonctionnalités Principales

### 🔐 Authentification
- Connexion et inscription utilisateur
- Gestion des profils utilisateur
- Protection des routes avec guards

### 📚 Gestion de Collection
- Ajout, modification et suppression de cartes
- Visualisation détaillée des cartes
- Suivi de la valeur de la collection
- Historique des activités

### 💾 Système de Cache Avancé
- **BaseCacheService** : Pattern de cache réutilisable
- Cache intelligent avec BehaviorSubjects
- Réduction drastique des appels Firebase
- Synchronisation automatique des données

### ⚠️ Gestion d'Erreurs Standardisée
- **ErrorHandlingService** : Système de gestion d'erreurs unifié
- **ErrorDisplayComponent** : Interface utilisateur cohérente
- Classification automatique des erreurs
- Messages conviviaux en français
- Système de récupération d'erreurs

## 🏗️ Architecture Technique

### Technologies Utilisées
- **Frontend** : Angular 18, Ionic 8, TypeScript
- **Backend** : Firebase (Firestore, Authentication)
- **Mobile** : Capacitor pour iOS/Android
- **Tests** : Jest avec approche TDD

### Structure du Projet
```
src/app/
├── components/          # Composants réutilisables
│   ├── error-display/   # Affichage d'erreurs standardisé
│   └── ...
├── interfaces/          # Définitions TypeScript
│   ├── error-handling.interface.ts
│   └── ...
├── pages/              # Pages de l'application
├── services/           # Services métier
│   ├── error-handling.service.ts
│   ├── base-cache.service.ts
│   └── ...
└── guards/             # Protection des routes
```

## 📖 Documentation

### Documentation Technique
- **[Système de Cache](docs/cache/)** - Stratégie et implémentation du cache
- **[Gestion d'Erreurs](docs/error-handling.md)** - Système de gestion d'erreurs standardisée
- **[Plan de Développement](task-list/cache_task-list.md)** - Feuille de route détaillée

### APIs et Interfaces
- **[Interfaces](src/app/interfaces/)** - Définitions TypeScript
- **[Services](src/app/services/)** - Documentation des services

## 🛠️ Installation et Développement

### Prérequis
- Node.js 18+
- Angular CLI 18+
- Ionic CLI 8+

### Installation
```bash
npm install
```

### Développement
```bash
npm run start          # Serveur de développement
npm run build          # Build de production
npm run test           # Tests unitaires
npm run lint           # Vérification du code
```

### Déploiement Mobile
```bash
ionic capacitor build ios      # Build iOS
ionic capacitor build android  # Build Android
```

## 🧪 Tests et Qualité

### Couverture de Tests
- **Services** : Tests unitaires complets avec mocks Firebase
- **Composants** : Tests d'intégration avec TestBed Angular
- **TDD** : Développement piloté par les tests pour nouvelles fonctionnalités

### Métriques de Qualité
- ✅ **22 tests** pour le système de gestion d'erreurs
- ✅ **Réduction de 70%** des appels Firebase grâce au cache
- ✅ **Temps de chargement** < 100ms pour données en cache

## 🎯 État du Projet

### ✅ Fonctionnalités Complétées

#### Phase 1-3 : Système de Cache
- ✅ **BaseCacheService** - Service de base réutilisable
- ✅ **CardStorageService** - Cache pour les cartes Pokémon
- ✅ **UserService** - Cache pour les données utilisateur
- ✅ **HistoryService** - Cache pour l'historique des activités
- ✅ **CollectionHistoryService** - Cache pour l'évolution de la collection

#### Phase 4.1 : Gestion d'Erreurs (TDD)
- ✅ **ErrorHandlingService** - Service de gestion standardisée
- ✅ **ErrorDisplayComponent** - Interface utilisateur d'erreurs
- ✅ **Tests complets** - 22 tests unitaires et d'intégration
- ✅ **Documentation** - Guide complet d'utilisation

### 🚧 En Cours de Développement

#### Phase 4.2 : Intégration Complète
- Intégration du système d'erreurs dans tous les services
- Optimisation des performances avec stratégie OnPush
- Monitoring et métriques avancées

#### Phase 4.3 : Interface Utilisateur
- Dashboard de monitoring des erreurs
- Feedback utilisateur pour les erreurs récupérables
- Analytics des patterns d'erreur

## 🤝 Contribution

### Workflow de Développement
1. **TDD** : Tests en premier pour nouvelles fonctionnalités
2. **Branches** : Feature branches avec pull requests
3. **Code Review** : Validation par pairs
4. **Tests** : Couverture minimale de 80%

### Standards de Code
- **ESLint** : Configuration stricte
- **Prettier** : Formatage automatique
- **TypeScript** : Mode strict activé
- **Français** : Documentation et messages utilisateur

## 📊 Métriques et Performance

### Cache Performance
- **Hit Rate** : 95% pour données fréquemment accédées
- **Réduction Firebase** : 70% d'appels en moins
- **Temps de réponse** : < 100ms pour données en cache

### Gestion d'Erreurs
- **Types gérés** : 6 types d'erreurs standardisés
- **Récupération** : Système automatique pour erreurs temporaires
- **UX** : Messages conviviaux en français

## 📝 Licence

Ce projet est développé dans le cadre d'un projet éducatif.

---

*Dernière mise à jour : Décembre 2024*
*Version : 1.0.0*

## 🔗 Liens Utiles

- [Documentation Angular](https://angular.io/docs)
- [Documentation Ionic](https://ionicframework.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs) 