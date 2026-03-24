# ClassGrade

## Project Overview

ClassGrade is a mobile application designed to streamline grade management for teachers and students. It provides a simple interface for users to register with a specific role ('teacher' or 'student') and will eventually allow for class and grade management.

This project is built with React Native and Expo, using Firebase Firestore as the backend database.

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Routing**: Expo Router

## Core Features

### Implemented

- **User Signup**: Users can create an account with their full name, a unique username, and a password.
- **Role Selection**: Users can register as either a 'Student' or a 'Teacher'.
- **Username Availability Check**: The signup process prevents duplicate usernames.

### Future Goals

- Secure user login.
- A dashboard for teachers to manage classes and grades.
- A dashboard for students to view their grades.
- Profile management.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
