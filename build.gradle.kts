import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.jetbrains.intellij") version "0.7.2"
    java
    kotlin("jvm") version "1.4.32"
}
group = "platform.plugin"
version = "0.3.1"

repositories {
    mavenCentral()
}
dependencies {
    implementation(kotlin("stdlib"))
    implementation ("org.slf4j:slf4j-simple:1.7.21")
    implementation ("org.java-websocket:Java-WebSocket:1.5.1")
    testImplementation("junit", "junit", "4.12")
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "1.8"
}

// See https://github.com/JetBrains/gradle-intellij-plugin/
intellij {
    version = "2020.1"
}

tasks.getByName<org.jetbrains.intellij.tasks.PatchPluginXmlTask>("patchPluginXml") {
    sinceBuild("200.*")
    untilBuild("212.*")
    changeNotes("""
      <strong>0.3.1</strong>
      <ul>
        <li>Added support to IntelliJ latest build version 212.* </li>
      </ul>
      <strong>0.2.1</strong>
      <ul>
        <li>Fix ghost line selection</li>
        <li>Fix fail split path on Windows Machine</li>
        <li>Support Android Studio 4.2</li>
      </ul>
      <strong>0.0.1</strong>
      <ul>
        <li>Initial preview release</li>
      </ul>""")
}