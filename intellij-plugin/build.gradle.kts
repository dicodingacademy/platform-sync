plugins {
    id("org.jetbrains.intellij") version "1.17.2"
    java
    kotlin("jvm") version "1.9.20"
}
group = "platform.plugin"
version = "0.6.2"

repositories {
    mavenCentral()
}

tasks {
    patchPluginXml {
        sinceBuild.set("200")
        untilBuild.set("251.*")
    }
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.7.20")
    implementation ("org.slf4j:slf4j-simple:1.7.32")
    implementation ("org.java-websocket:Java-WebSocket:1.5.2")
    testImplementation("junit", "junit", "4.12")
}

intellij {
    version = "2023.3.1"
}