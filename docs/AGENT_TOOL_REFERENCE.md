# Agent Tool Reference

## Zweck
Dieses Dokument listet die im Projekt definierten Agent-/Builder-Tools auf, beschreibt kurz, was jedes Tool kann, und nennt pro Tool einen pragmatischen Testansatz.

## Quellen
- `src/lib/agent/tools/client-tool-catalog.ts`
- `src/lib/agent/tools/agents-tool-specs.ts`
- `src/lib/agent/tools/builder-tool-specs.ts`
- `src/lib/agent/tools/tool-metadata.ts`

## Testlogik
Die Testvorschlaege sind bewusst knapp gehalten:
- `UI-Test`: Tool ueber UI oder Agent ausloesen und sichtbare Aenderung pruefen.
- `State-Test`: Store-/Persistenzwert vor/nach Ausfuehrung vergleichen.
- `Negativtest`: Ungueltige ID, fehlendes Pflichtfeld oder fehlende Integration pruefen.
- `Sicherheits-Test`: Bei destruktiven Tools pruefen, dass Bestaetigung oder Schutz greift.

## Legende
- `UI`: veraendert sichtbare Oberflaeche
- `Storage`: schreibt oder liest persistente Daten
- `Network`: nutzt externe Verbindung
- `Destruktiv`: loescht oder setzt aktiv zurueck
- `Integration`: benoetigt externe Verbindung wie Gmail oder Browser

## 1. App- und Core-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `app.openModule` | Oeffnet ein Modul in LifeOS. | UI-Test: Tool mit `calendar` oder `agents` ausloesen und geoeffnetes Modul pruefen. |
| `app.navigate` | Navigiert auf einen App-Pfad. | UI-Test: auf `/settings` oder `/library` navigieren und URL/Ansicht pruefen. |
| `app.changeBackground` | Aendert den Dashboard-Hintergrund. | UI-Test: Hintergrund wechseln; State-Test: gespeicherten Background-Wert pruefen. |
| `app.toggleSidebar` | Oeffnet oder schliesst die Sidebar. | UI-Test: zweimal ausloesen und offenen/geschlossenen Zustand pruefen. |
| `app.switchTab` | Wechselt auf einen bereits offenen Tab. | UI-Test: zwei Module oeffnen, Tool ausloesen, aktiven Tab pruefen. |
| `app.closeTab` | Schliesst einen offenen Tab. | UI-Test: Modul-Tab oeffnen, Tool ausloesen, Tab-Verschwinden pruefen. |
| `app.searchGlobal` | Startet globale App-Suche. | UI-Test: Suchoverlay oeffnen und Query-Fokus pruefen. |
| `app.help` | Liefert Hilfetexte fuer Themen oder Module. | State-Test: Rueckgabeinhalt fuer bekanntes Thema pruefen; Negativtest fuer unbekanntes Thema. |
| `memory.recall` | Sucht relevante gespeicherte Memories. | State-Test: Memory anlegen, Recall mit Suchwort, Treffer pruefen. |
| `memory.list` | Listet gespeicherte Memories auf. | State-Test: mehrere Memories anlegen, Listenergebnis und Kategorie-Filter pruefen. |
| `memory.save` | Speichert Fakten, Praeferenzen oder Instruktionen. | State-Test: Memory speichern und anschliessend listen/recallen. |
| `memory.update` | Aktualisiert einen bestehenden Memory-Eintrag. | State-Test: Eintrag aendern und neuen Wert pruefen. |
| `memory.delete` | Loescht einen Memory-Eintrag. | Sicherheits-Test: Loeschung bestaetigen; danach Recall/List ohne Eintrag pruefen. |
| `memory.clearCategory` | Loescht alle Memories einer Kategorie. | Sicherheits-Test: Kategorie fuellen, Tool ausloesen, nur diese Kategorie pruefen. |
| `memory.export` | Exportiert gespeicherte Memories. | State-Test: Exportpayload auf Vollstaendigkeit und Struktur pruefen. |
| `memory.import` | Importiert Memories aus einer Payload. | State-Test: Export wieder importieren und Vollstaendigkeit pruefen; Negativtest mit kaputter Payload. |

## 2. Kalender-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `calendar.createEvent` | Erstellt ein Kalender-Event. | UI-Test: Event mit Titel/Zeit anlegen und im Kalender sichtbar pruefen. |
| `calendar.listEvents` | Listet Termine fuer einen Zeitraum. | State-Test: mehrere Events anlegen, Zeitraum filtern, korrekte Treffer pruefen. |
| `calendar.deleteEvent` | Loescht ein Kalender-Event. | Sicherheits-Test: Event loeschen und Verschwinden in UI/Store pruefen. |
| `calendar.open` | Oeffnet die Kalenderansicht. | UI-Test: Tool ausloesen, Kalender-Root sichtbar. |
| `calendar.getStatus` | Liefert Kalender-Statusinformationen. | State-Test: Rueckgabe mit Event-Anzahl oder Kalenderzustand pruefen. |
| `calendar.updateEvent` | Aktualisiert ein bestehendes Event. | UI-Test: Titel oder Zeitpunkt aendern und im Event-Detail/Store pruefen. |

## 3. Inbox-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `inbox.sendEmail` | Bereitet E-Mail-Versand vor. | UI-Test: Draft oder Versanddialog mit Feldern pruefen; Negativtest ohne Gmail-Integration. |
| `inbox.searchEmails` | Durchsucht E-Mails nach Kriterien. | Integrationstest: bekannte Mail suchen und Trefferliste pruefen. |
| `inbox.open` | Oeffnet das Postfach. | UI-Test: Inbox-Ansicht sichtbar. |
| `inbox.markEmail` | Markiert, archiviert oder loescht Mails. | State-Test: Mail markieren/archivieren und Statuswechsel pruefen. |
| `inbox.composeEmail` | Oeffnet Compose mit Vorbelegung. | UI-Test: Empfaenger/Betreff/Body vorbefuellt pruefen. |
| `inbox.getStatus` | Liefert Postfach-Metriken. | State-Test: Rueckgabe wie Unread/Counts pruefen. |
| `inbox.filterEmails` | Setzt Inbox-Filter wie Provider oder Prioritaet. | UI-Test: Filter anwenden und Trefferliste pruefen. |

## 4. Browser-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `browser.navigate` | Oeffnet eine URL im Browser. | UI-Test: URL ausloesen und Adress-/Seitenwechsel pruefen. |
| `browser.search` | Startet eine Websuche. | UI-Test: Suchbegriff ausloesen und Suchergebnisse pruefen. |
| `browser.addBookmark` | Speichert ein Lesezeichen. | State-Test: Bookmark erzeugen und im Browser-Store/UI pruefen. |
| `browser.open` | Oeffnet den Browser-Tab. | UI-Test: Browser-Modul sichtbar. |
| `browser.getStatus` | Liefert Browser-Statusinfos. | State-Test: offene URL, Tab-Status oder Sessiondaten pruefen. |
| `browser.extractPage` | Extrahiert lesbaren Seiteninhalt. | Integrationstest: Textseite oeffnen und extrahierten Inhalt auf Schluesseltext pruefen. |
| `browser.summarizePage` | Fasst die aktuelle Seite zusammen. | Integrationstest: bekannte Seite oeffnen und sinnvolle Summary pruefen. |
| `browser.readSelection` | Liest die aktuelle Browser-Auswahl. | UI-Test: Text selektieren und Rueckgabe auf exakten Ausschnitt pruefen. |
| `browser.downloadFile` | Startet einen Datei-Download. | Integrationstest: Download-Link ausloesen und Download-/Dateieintrag pruefen. |

## 5. User-Facing Agents-Wrapper
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.openWorkspace` | Oeffnet den Agents-Workspace. | UI-Test: Agents-Modul oder Fenster sichtbar. |
| `agents.createAgent` | Erstellt einen neuen Agenten. | UI-Test: Agent anlegen und in Sidebar/Settings pruefen. |
| `agents.updateAgent` | Aktualisiert Agent-Einstellungen. | State-Test: Name/Farbe/Prompt aendern und speichern pruefen. |
| `agents.deleteAgent` | Loescht einen Agenten. | Sicherheits-Test: Loeschen bestaetigen und Entfernen aus Hierarchie pruefen. |
| `agents.createGroup` | Erstellt eine Agent-Gruppe. | UI-Test: Gruppe anlegen und Gruppen-Hub pruefen. |
| `agents.runCouncil` | Startet eine Council-Deliberation. | UI-Test: Council-Run starten und Status/Output pruefen. |

## 6. Settings-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `settings.open` | Oeffnet den Settings-Bereich. | UI-Test: Settings-Ansicht sichtbar. |
| `settings.search` | Sucht nach Settings-Bereichen. | UI-Test: Suchquery setzen und passende Sektionen pruefen. |
| `settings.updatePreference` | Setzt eine User-Praeferenz. | State-Test: Praeferenz aendern und Reload pruefen. |
| `settings.getPreference` | Laedt eine gespeicherte Praeferenz. | State-Test: vorhandenen Wert lesen und mit Store vergleichen. |
| `settings.listSections` | Listet verfuegbare Settings-Sektionen. | State-Test: Rueckgabe auf erwartete Sektionen pruefen. |
| `settings.export` | Exportiert Settings oder Sektionen. | State-Test: Exportstruktur und enthaltene Keys pruefen. |
| `settings.import` | Importiert Settings aus einer Payload. | Sicherheits-Test: gueltigen Import pruefen; Negativtest mit defekter Payload. |
| `settings.setTheme` | Setzt das globale Theme. | UI-Test: Theme-Wechsel sichtbar und persistiert pruefen. |
| `settings.setLanguage` | Setzt die App-Sprache. | UI-Test: Sprache wechseln und Textaenderung pruefen. |
| `settings.setPrivacyMode` | Aktiviert oder deaktiviert Privacy-Modi. | State-Test: Flag aendern und UI-/Behavior-Aenderung pruefen. |
| `settings.resetPreference` | Setzt eine Praeferenz auf Standard. | Sicherheits-Test: Wert aendern, resetten, Default wieder aktiv pruefen. |

## 7. Marketplace-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `marketplace.open` | Oeffnet die Modul-Bibliothek. | UI-Test: Library/Marketplace sichtbar. |
| `marketplace.search` | Sucht Module im Marketplace. | UI-Test: Query setzen und gefilterte Treffer pruefen. |
| `marketplace.getModule` | Laedt Moduldetails. | State-Test: Detaildaten fuer bekannte Modul-ID pruefen. |
| `marketplace.listInstalled` | Listet installierte Module auf. | State-Test: installierte Module mit Registry vergleichen. |
| `marketplace.install` | Installiert ein Modul. | Sicherheits-Test: Installation bestaetigen und Modul in Registry/UI pruefen. |
| `marketplace.updateModule` | Aktualisiert ein Modul. | Sicherheits-Test: Update triggern und neue Version/Metadaten pruefen. |
| `marketplace.openModuleDetails` | Oeffnet die Detailansicht eines Moduls. | UI-Test: Detailpanel oder Seite oeffnet korrekt. |
| `marketplace.rateModule` | Bewertet ein Modul. | Integrationstest: Bewertung senden und Rueckgabe/UI-Badge pruefen. |
| `marketplace.uninstall` | Deinstalliert ein Modul. | Sicherheits-Test: Modul deinstallieren und Entfernen aus Registry/UI pruefen. |

## 8. Lab-Wrapper
| Tool | Kann | Testen |
| --- | --- | --- |
| `lab.runDebugCommand` | Fuehrt sichere Debug-Befehle aus. | Test: harmlosen Befehl wie `ls`/`rg` ausloesen und Rueckgabe pruefen. |
| `lab.openBuilder` | Oeffnet den Module Builder. | UI-Test: Builder-Ansicht sichtbar. |
| `lab.createProject` | Erstellt ein neues Builder-Projekt. | UI-/State-Test: Projekt erscheint in Projektliste. |
| `lab.generateModule` | Startet Modul-Generierung. | Integrationstest: Generierung starten und neue Dateien/Logs pruefen. |
| `lab.previewModule` | Erzeugt eine Modul-Vorschau. | UI-Test: Preview wird gerendert. |
| `lab.publishModule` | Publiziert ein generiertes Modul. | Sicherheits-Test: Publish bestaetigen und Sichtbarkeit/Registry pruefen. |

## 9. Detaillierte Agents-Tools

### 9.1 Konversationen und Nachrichten
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.conversation.create` | Erstellt eine neue Konversation fuer Agent oder Gruppe. | State-Test: neue Konversation erscheint mit passender `agentId`. |
| `agents.conversation.delete` | Loescht eine Konversation. | Sicherheits-Test: nach Loeschung nicht mehr in Sidebar/Store vorhanden. |
| `agents.conversation.setActive` | Setzt die aktive Konversation in der UI. | UI-Test: aktive Chatansicht springt auf Ziel-Konversation. |
| `agents.conversation.rename` | Bennent Konversation um. | UI-Test: neuer Titel in Sidebar und Header sichtbar. |
| `agents.conversation.pinToggle` | Schaltet Pin-Status um. | State-Test: `isPinned` aendert sich und Reihenfolge/Badge stimmt. |
| `agents.message.add` | Fuegt Nachricht zu Konversation hinzu. | State-Test: Nachricht erscheint mit Rolle und Inhalt. |
| `agents.message.update` | Aendert eine vorhandene Nachricht. | State-Test: Inhalt der Zielnachricht aktualisiert sich. |
| `agents.message.delete` | Loescht eine Nachricht. | Sicherheits-Test: Nachricht verschwindet, Verlauf bleibt konsistent. |
| `agents.conversation.updateParticipants` | Aktualisiert Teilnehmer einer Gruppen-Konversation. | State-Test: `participantIds`/UI-Teilnehmerliste aktualisiert sich. |

### 9.2 Ordner und Gruppenbibliothek
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.folder.create` | Erstellt Chat-Ordner. | UI-Test: Ordner in Sidebar sichtbar. |
| `agents.folder.update` | Aktualisiert Ordnernamen oder Farbe. | UI-Test: Namens-/Farbwechsel pruefen. |
| `agents.folder.delete` | Loescht Chat-Ordner. | Sicherheits-Test: Ordner verschwindet; enthaltene Konversationen bleiben konsistent. |
| `agents.folder.moveConversation` | Verschiebt Konversation in einen Ordner. | UI-Test: Konversation erscheint nur im Zielordner. |
| `agents.groupFileFolder.create` | Erstellt Dateiordner in einer Gruppe. | UI-Test: Ordner in Gruppenbibliothek sichtbar. |
| `agents.groupFile.add` | Fuegt Gruppe Datei oder Artefakt hinzu. | State-Test: Datei-Metadaten und Inhalt vorhanden. |
| `agents.groupFile.move` | Verschiebt Gruppendatei in anderen Ordner. | UI-Test: Datei erscheint im Zielordner. |
| `agents.groupFile.delete` | Loescht Gruppendatei. | Sicherheits-Test: Datei verschwindet aus Bibliothek. |
| `agents.groupMainConversation.ensure` | Stellt Hauptkonversation einer Gruppe sicher. | State-Test: fehlende Hauptkonversation wird erzeugt, vorhandene bleibt stabil. |
| `agents.groupParticipantChats.ensure` | Stellt Einzelchats fuer Gruppenmitglieder sicher. | State-Test: Teilnehmerchats existieren fuer alle Rollen. |

### 9.3 Agent- und Gruppenverwaltung
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.agent.select` | Waehlt einen Agenten aktiv aus. | UI-Test: Fokus/Settings/Chat beziehen sich auf Ziel-Agent. |
| `agents.agent.createCustom` | Erstellt benutzerdefinierten Agenten. | UI-Test: Agent in `Eigene Agents` sichtbar. |
| `agents.agent.updateCustom` | Aktualisiert benutzerdefinierten Agenten. | State-Test: geaenderte Felder in Store und UI pruefen. |
| `agents.agent.deleteCustom` | Loescht benutzerdefinierten Agenten mit Dependency-Check. | Sicherheits-Test: Loeschung mit/ohne `force` pruefen. |
| `agents.group.create` | Erstellt neue Agent-Gruppe. | UI-Test: Gruppe im Gruppen-Hub sichtbar. |
| `agents.group.update` | Aktualisiert Gruppe, Rollen oder Metadaten. | State-Test: Gruppenname und Teilnehmerrollen pruefen. |
| `agents.breakout.create` | Erstellt Breakout-Session. | UI-Test: Breakout erscheint als Untergruppe/Session. |
| `agents.breakout.upsert` | Erstellt oder aktualisiert Breakout. | State-Test: gleicher `breakoutId` wird sauber aktualisiert. |
| `agents.agent.createOrchestrated` | Erstellt Agenten inkl. Orchestrierungs-Setup. | Integrationstest: Agent plus Settings/Capabilities entstehen gemeinsam. |

### 9.4 Council-Runtime
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.council.draft.create` | Erstellt Council-Draft. | UI-Test: Draft in Council-Liste sichtbar. |
| `agents.council.open` | Oeffnet Council-Draft. | UI-Test: Council-Ansicht zeigt richtigen Draft. |
| `agents.council.sync` | Synchronisiert Council-State und Sitzordnung. | State-Test: Seats/Nachrichten werden aus Store konsistent geladen. |
| `agents.council.persist` | Speichert Council dauerhaft. | State-Test: Reload behaelt Council-Daten. |
| `agents.council.delete` | Loescht Council. | Sicherheits-Test: Council verschwindet aus Liste und Storage. |
| `agents.council.seat.upsert` | Erstellt oder aktualisiert Council-Sitz. | UI-Test: Sitz erscheint/aktualisiert sich in Sitzordnung. |
| `agents.council.seat.remove` | Entfernt Council-Sitz. | Sicherheits-Test: Sitz verschwindet ohne Layout-Bruch. |
| `agents.council.mainMessage.add` | Fuegt Nachricht im Haupt-Thread hinzu. | UI-Test: Nachricht im zentralen Council-Chat sichtbar. |
| `agents.council.mainMessage.update` | Aktualisiert Haupt-Thread-Nachricht. | State-Test: Inhalt der Nachricht aendert sich. |
| `agents.council.mainMessage.clear` | Leert Haupt-Thread. | Sicherheits-Test: Verlauf ist danach leer. |
| `agents.council.memberMessage.add` | Fuegt Nachricht zu Mitglieds-Thread hinzu. | UI-Test: Nachricht nur im Thread des Seats sichtbar. |
| `agents.council.memberMessage.update` | Aktualisiert Mitglieds-Thread-Nachricht. | State-Test: geaenderter Inhalt im Zielthread sichtbar. |
| `agents.council.memberMessage.clear` | Leert Mitglieds-Thread. | Sicherheits-Test: nur Thread des Seats wird geleert. |
| `agents.council.run` | Startet Council-Run inklusive Deliberation. | Integrationstest: Phasen wechseln, Outputs entstehen, Status sichtbar. |
| `agents.council.abortAndReset` | Bricht Council-Run ab und setzt State zurueck. | Sicherheits-Test: laufender Run stoppt, UI kehrt in definierten Zustand zurueck. |

### 9.5 Gruppen-Orchestrierung und Objectives
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.objective.add` | Fuegt Gruppenziel hinzu. | UI-Test: Ziel erscheint in Objectives-Liste. |
| `agents.objective.update` | Aktualisiert Gruppenziel. | State-Test: Titel/Status/Prioritaet aktualisiert sich. |
| `agents.objective.delete` | Loescht Gruppenziel. | Sicherheits-Test: Ziel verschwindet aus Gruppe. |
| `agents.orchestration.mode.change` | Wechselt strukturierten Gespraechsmodus. | UI-Test: Modus-Badge und Store-Wert pruefen. |
| `agents.orchestration.task.delegate` | Delegiert Aufgabe an Agent oder Breakout. | UI-/State-Test: delegierter Task erscheint beim Ziel. |
| `agents.orchestration.breakout.create` | Erstellt Breakout aus der Orchestrierung. | UI-Test: neuer Breakout-Branch sichtbar. |
| `agents.orchestration.artifact.save` | Speichert Gruppen-Artefakt. | State-Test: Artefakt in Bibliothek vorhanden. |
| `agents.orchestration.artifact.update` | Aktualisiert Gruppen-Artefakt. | State-Test: Inhalt des Artefakts aendert sich. |
| `agents.orchestration.folder.create` | Erstellt Gruppenordner fuer Artefakte. | UI-Test: Ordner in Artefakt-Bereich sichtbar. |

### 9.6 Scheduled Tasks
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.task.create` | Erstellt geplante Agent-Aufgabe. | UI-Test: Task erscheint in Taskliste des Ziel-Agenten. |
| `agents.task.update` | Aktualisiert geplante Aufgabe. | State-Test: Felder wie Prompt oder Zeitplan aendern sich. |
| `agents.task.toggleEnabled` | Aktiviert oder deaktiviert geplante Aufgabe. | UI-Test: Status/Badge wechselt zwischen aktiv und pausiert. |
| `agents.task.runNow` | Startet manuellen Probelauf einer Aufgabe. | UI-Test: Run-History-Eintrag entsteht. |
| `agents.task.duplicate` | Dupliziert geplante Aufgabe. | State-Test: zweite Task mit neuem `id`, aber gleicher Basisstruktur. |
| `agents.task.delete` | Loescht geplante Aufgabe. | Sicherheits-Test: Task verschwindet aus Liste und Store. |

### 9.7 Agent-Settings, Skills und Integrationen
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.settings.model.set` | Setzt Provider und Modell eines Agenten. | State-Test: Modellwert in Agent-Config aktualisiert sich. |
| `agents.settings.prompt.set` | Setzt System-Prompt eines Agenten. | State-Test: Prompt wird gespeichert und erneut geladen. |
| `agents.settings.tools.enableDisable` | Aendert aktive Tools eines Agenten. | Sicherheits-Test: Toolliste aendern und Settings-UI/Scope pruefen. |
| `agents.settings.skills.enableDisable` | Aendert aktive Skills eines Agenten. | State-Test: aktivierte Skills in Konfiguration sichtbar. |
| `agents.settings.integrations.allowDeny` | Setzt erlaubte Integrationen. | State-Test: Browser/Gmail-Freigaben danach korrekt erlaubt/verboten. |
| `agents.settings.humanInLoop.set` | Setzt Tools mit Bestaetigungspflicht. | Sicherheits-Test: definiertes Tool fordert danach Freigabe. |
| `agents.settings.multimodal.set` | Konfiguriert Bild/Video/TTS/STT-Slots. | State-Test: Multimodal-Konfiguration persistiert. |
| `agents.integration.status.refresh` | Aktualisiert Integrationsstatus. | Integrationstest: nach Connect/Disconnect neuer Status sichtbar. |

### 9.8 Analytics und Agents-Memory
| Tool | Kann | Testen |
| --- | --- | --- |
| `agents.analytics.usage.get` | Laedt Usage- und Aktivitaetsmetriken. | State-Test: Rueckgabe fuer bekannten Agenten ist strukturiert und plausibel. |
| `agents.analytics.conversationSummary.get` | Laedt Konversations-Summary. | State-Test: Summary fuer Konversation vorhanden oder leer definiert. |
| `agents.memory.save` | Speichert agents-spezifisches Wissen. | State-Test: Eintrag nach Save in Recall/List auffindbar. |
| `agents.memory.recall` | Sucht agents-spezifische Memories. | State-Test: Query liefert passenden Eintrag. |
| `agents.memory.list` | Listet agents-spezifische Memories. | State-Test: Kategorie-Filter und Gesamtmenge pruefen. |

## 10. Detaillierte Builder-Tools

### 10.1 Projekte und Sessions
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.project.create` | Erstellt neues Builder-Projekt. | UI-/State-Test: Projekt erscheint in Liste. |
| `builder.project.list` | Listet Builder-Projekte. | State-Test: Rueckgabe mit existierenden Projekten pruefen. |
| `builder.project.get` | Laedt ein Projekt im Detail. | State-Test: Metadaten, Dateien und IDs pruefen. |
| `builder.project.updateMeta` | Aktualisiert Projekt-Metadaten. | UI-Test: Name/Beschreibung/Icon aendern und reloaden. |
| `builder.project.duplicate` | Dupliziert ein Projekt. | State-Test: neues Projekt mit eigenem `id` und gleichen Inhalten. |
| `builder.project.archive` | Archiviert ein Projekt. | Sicherheits-Test: Projekt verschwindet aus aktiver Liste, bleibt historisch erhalten. |
| `builder.project.delete` | Loescht ein Projekt. | Sicherheits-Test: mit optionalem Backup loeschen und Ergebnis pruefen. |
| `builder.session.setMode` | Setzt Builder-Modus auf `build`, `discuss` oder `pro`. | UI-Test: Session-Modus und passende UI wechseln. |

### 10.2 Prompt- und Ideen-Tools
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.prompt.suggest` | Schlaegt besseren Builder-Prompt vor. | Integrationstest: aus grober Idee strukturierte Vorlage erzeugen. |
| `builder.prompt.submit` | Reicht Prompt in Session ein. | UI-/State-Test: Prompt taucht im Verlauf auf und startet Verarbeitung. |
| `builder.prompt.refine` | Verfeinert bestehenden Prompt mit Zusatzinstruktion. | Integrationstest: Prompt mit zusaetzlicher Constraint neu erzeugen. |
| `builder.prompt.attachBaseContext` | Haengt bestehenden oder neuen Base-Kontext an. | State-Test: Session enthaelt danach Base-Bindung. |

### 10.3 Codegen und Dateien
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.generate.run` | Startet Code-Generierung. | Integrationstest: neue/aktualisierte Projektdateien und Logs pruefen. |
| `builder.generate.retryWithRepair` | Wiederholt Build mit Reparaturhinweis. | Integrationstest: nach Fehler Repair anstossen und verbesserten Output pruefen. |
| `builder.files.list` | Listet alle Projektdateien. | State-Test: Dateibaum vollstaendig und sortiert pruefen. |
| `builder.file.get` | Liest Inhalt einer Datei. | State-Test: Inhalt mit Dateisystem/Store vergleichen. |
| `builder.file.set` | Ersetzt kompletten Dateiinhalt. | State-Test: Dateiinhalt entspricht exakt neuem Text. |
| `builder.file.patch` | Patcht Datei via Search/Replace. | Positivtest: eindeutige Ersetzung; Negativtest: Suchstring fehlt. |
| `builder.file.rename` | Bennent Datei um. | State-Test: alter Pfad weg, neuer Pfad vorhanden. |
| `builder.file.move` | Verschiebt Datei. | State-Test: Datei im Zielordner vorhanden. |
| `builder.file.create` | Erstellt neue Datei. | State-Test: neue Datei mit Initialinhalt vorhanden. |
| `builder.file.delete` | Loescht Datei. | Sicherheits-Test: Datei verschwindet nach Bestaetigung. |

### 10.4 Validierung, Preview und Debug
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.validate.contract` | Prueft `App.tsx`, `module.json` und Grundstruktur. | Test: valides und absichtlich defektes Projekt pruefen. |
| `builder.validate.compile` | Fuehrt Compile-/Type-Check aus. | Test: TS-Fehler einfuegen und Erkennung pruefen. |
| `builder.validate.uiQuality` | Prueft Layout und UI-Grundqualitaet. | Test: absichtlich problematisches Layout bewerten lassen. |
| `builder.validate.lucideImports` | Prueft gueltige Lucide-Icons. | Test: ungueltiges Icon einfuegen und Fehler pruefen. |
| `builder.preview.render` | Rendert Modul-Vorschau. | UI-Test: Preview startet und zeigt aktuelle Version. |
| `builder.debug.runCommand` | Fuehrt erlaubte Debug-Befehle im Builder-Kontext aus. | Test: `rg`, `ls` oder `npm` mit harmlosen Args pruefen. |
| `builder.debug.captureErrors` | Sammelt strukturierte Preview-/Build-Fehler. | Test: Fehler erzeugen und strukturierte Rueckgabe pruefen. |

### 10.5 Modul-Manifest, API und Customisierung
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.module.setManifest` | Setzt zentrale Manifest-Felder. | State-Test: `module.json` bzw. Manifestzustand pruefen. |
| `builder.module.setEntry` | Setzt Entry-Point des Moduls. | Test: Entry aendern und Preview/Compile pruefen. |
| `builder.module.setPermissions` | Setzt Modul-Permissions. | Sicherheits-Test: Permission-Liste aktualisieren und Persistenz pruefen. |
| `builder.module.tool.add` | Fuegt Modul-Tool hinzu. | State-Test: neue Tool-Definition in Modul-API sichtbar. |
| `builder.module.tool.update` | Aktualisiert Modul-Tool. | State-Test: Beschreibung/Schema des Tools aendert sich. |
| `builder.module.tool.remove` | Entfernt Modul-Tool. | Sicherheits-Test: Tool verschwindet aus Manifest/API. |
| `builder.module.event.add` | Fuegt Modul-Event hinzu. | State-Test: Event erscheint in Eventliste/Manifest. |
| `builder.module.event.update` | Aktualisiert Modul-Event. | State-Test: Eventfelder geaendert. |
| `builder.module.event.remove` | Entfernt Modul-Event. | Sicherheits-Test: Event wird sauber entfernt. |
| `builder.module.customPrompt.set` | Setzt projektspezifischen Custom-Prompt. | State-Test: Prompt, Constraints und Beispiele persistieren. |
| `builder.module.apiKey.add` | Fuegt API-Key-Konfiguration hinzu. | Sicherheits-Test: Konfiguration erscheint ohne Klartext-Leak. |
| `builder.module.apiKey.update` | Aktualisiert API-Key-Konfiguration. | Sicherheits-Test: Metadaten aktualisieren und Maskierung pruefen. |
| `builder.module.apiKey.remove` | Entfernt API-Key-Konfiguration. | Sicherheits-Test: Eintrag verschwindet vollstaendig. |

### 10.6 Aktivierung, Publishing und Distribution
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.module.activate` | Schreibt Modul in `src/modules` und aktiviert es lokal. | Integrationstest: Modul erscheint in Registry und UI. |
| `builder.module.publish` | Publiziert Modul als `private` oder `public`. | Sicherheits-Test: Sichtbarkeit nach Publish korrekt. |
| `builder.module.unpublish` | Nimmt Modul aus dem Publish-Zustand. | Test: Modul nicht mehr als publiziert markiert. |
| `builder.module.deactivate` | Deaktiviert Modul bevorzugt weich. | UI-Test: Modul verschwindet aus aktiver Navigation, Daten bleiben erhalten. |
| `builder.module.rollbackToSnapshot` | Setzt Projekt auf frueheren Snapshot zurueck. | Sicherheits-Test: Snapshot wiederherstellen und Dateistand pruefen. |
| `builder.registry.refresh` | Aktualisiert Modul-Registry. | State-Test: Registry erkennt aktuelle Aktivierungen/Publishes. |
| `builder.module.exportZip` | Exportiert Projekt als ZIP. | Test: ZIP-Datei entsteht und enthaelt erwartete Struktur. |

### 10.7 Audit und Backups
| Tool | Kann | Testen |
| --- | --- | --- |
| `builder.audit.list` | Listet Audit-Eintraege und kritische Aktionen. | State-Test: letzte Aktionen in korrekter Reihenfolge pruefen. |
| `builder.audit.getActionDiff` | Laedt Diff eines Audit-Eintrags oder Snapshots. | Test: Diff fuer bekannte Aenderung laden und Inhalt pruefen. |
| `builder.backup.createSnapshot` | Erstellt Backup-Snapshot des Projekts. | State-Test: neuer Snapshot mit Label vorhanden. |
| `builder.backup.restoreSnapshot` | Stellt Snapshot wieder her. | Sicherheits-Test: Datei aendern, Snapshot restoren, alten Stand pruefen. |

## 11. Empfohlene Smoke-Test-Sets

### Core
- `app.openModule`
- `app.switchTab`
- `memory.save`
- `memory.recall`

### Produktivmodule
- `calendar.createEvent`
- `inbox.composeEmail`
- `browser.navigate`
- `settings.setTheme`

### Agents
- `agents.conversation.create`
- `agents.agent.createCustom`
- `agents.group.create`
- `agents.task.create`
- `agents.settings.model.set`
- `agents.council.run`

### Builder
- `builder.project.create`
- `builder.generate.run`
- `builder.file.patch`
- `builder.validate.compile`
- `builder.module.activate`
- `builder.backup.createSnapshot`

## 12. Kritische Testfaelle
- Alle Tools mit `delete`, `remove`, `clear`, `reset`, `rollback`, `archive`, `unpublish`, `deactivate` immer mit Positiv- und Negativfall testen.
- Alle `inbox.*`- und `browser.*`-Tools auch ohne Integration pruefen, damit saubere Fehlermeldungen sichtbar sind.
- Alle `agents.*settings*`- und `builder.module.*`-Tools nach Reload auf Persistenz pruefen.
- Alle `ui`-Tools sowohl im Vollseiten- als auch im eingebetteten Dashboard-Kontext pruefen, wenn die UI beide Modi besitzt.
