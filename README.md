# Platform Sync

Platform Sync is a code review tool that synchronizes file and cursor positions between IDE (IntelliJ IDEA/Android Studio/VS Code) and Didocing Review Platform.

## Platform Compatibility

- IntelliJ IDEA 2020.1 or later (build 200+)
- Android Studio 4.2 or later
- Supports up to IntelliJ 2024.1 (build 243.\*)
- Latest Android Studio versions supported (Giraffe, Iguana, Jellyfish)

## Project Structure

```
platform-sync/
├── .github/            # GitHub Actions workflows
├── intellij-plugin/    # IntelliJ IDEA plugin
│   ├── src/           # Plugin source code
│   ├── gradle/        # Gradle configuration
│   ├── build/         # Build output
│   ├── build.gradle.kts   # Gradle build script
│   ├── gradle.properties  # Gradle properties
│   ├── gradlew       # Gradle wrapper script
│   ├── gradlew.bat   # Gradle wrapper script for Windows
│   └── settings.gradle.kts # Gradle settings
├── vscode-extension/  # VS Code extension
│   ├── src/          # Extension source code
│   ├── types.ts      # TypeScript types
│   ├── websocket.ts  # WebSocket server
│   ├── package.json  # NPM configuration
│   ├── tsconfig.json # TypeScript configuration
│   └── platform-sync-vscode-0.0.3.vsix # Packaged extension
└── package.json      # Root NPM configuration
```

## Prerequisites

- Java JDK 17 or higher (for IntelliJ plugin)
- Node.js 18 or higher (for VS Code extension)
- npm (comes with Node.js)

## Building

You can build both plugins using npm:

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Or build specific components
npm run build:intellij  # Build IntelliJ plugin only
npm run build:vscode    # Build VS Code extension only
npm run package:vscode  # Package VS Code extension
```

## IntelliJ Plugin

### Development Setup

Follow the guide for setting up the SDK at [Setting Up Environment](https://plugins.jetbrains.com/docs/intellij/setting-up-environment.html#preliminary-steps)

### Building Manually

1. Open the Gradle tab in the top right
2. Navigate to `platform-sync` -> `Tasks` -> `intellij` -> `buildPlugin`
3. Wait for the build to complete

### Running in Development Mode

1. Open the `intellij-plugin` directory in IntelliJ IDEA
2. Install dependencies: `./gradlew build`
3. Start development: `./gradlew runIde`

### Installation

1. Open IntelliJ IDEA/Android Studio settings -> Plugins
2. Click the gear icon and select "Install Plugin from Disk..."
3. Navigate to `intellij-plugin/build/distributions/`
4. Restart the IDE when prompted

## VS Code Extension

### Development

1. Open the `vscode-extension` directory in VS Code
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Press F5 to launch a new VS Code window with the extension

### Building Manually

```bash
npm run build:vscode   # Build the extension
npm run package:vscode # Create VSIX package
```

The packaged extension will be available as a `.vsix` file in the `vscode-extension` directory.

### Installation

1. In VS Code, press Ctrl+Shift+P
2. Type "Install from VSIX"
3. Select the `.vsix` file from the `vscode-extension` directory


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Releasing

1. Create and push a new tag starting with 'v' (e.g., v1.0.0)
2. GitHub Actions will automatically:
   - Build both plugins
   - Create a GitHub release with both artifacts
   - Publish the VS Code extension to the marketplace

## Available Scripts

- `npm run build` - Build both plugins
- `npm run build:intellij` - Build IntelliJ plugin only
- `npm run build:vscode` - Build VS Code extension only
- `npm run package:vscode` - Package VS Code extension
- `npm run dev:vscode` - Start VS Code extension in development mode
- `npm run lint` - Run linting
- `npm run clean` - Clean build artifacts
