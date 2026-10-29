# Narration script: RockShield patent claims video

Voice: Indian-English narrator (Google Cloud TTS, en-IN), calm and unhurried, about 145 words per minute.
Tone: an engineer explaining their own system to an examiner. Plain words, real names, no hype.

Rules for this script
- Reference numerals (101a, 103c …) appear on screen only. They are never spoken.
- "In our prototype …" introduces what the RockShield code actually does (PROTOTYPE scenes).
- "The claim also covers …" introduces the wider scope (EMBODIMENT scenes).
- Any data shown is described as coming from the simulated dataset.
- `[[beat:name]]` marks a visual change; it is not spoken.

Pronunciation (applied automatically for the voice)
| Written | Spoken |
|---|---|
| XGBoost | ex gee boost |
| LSTM | L S T M |
| ROC | R O C |
| MQTT | M Q T T |
| AMQP | A M Q P |
| DDS | D D S |
| CoAP | co app |
| ZeroMQ | zero M Q |
| LoRaWAN | lora wan |
| LoRa | lora |
| NB-IoT | N B I o T |
| ZigBee | zig bee |
| TimescaleDB | timescale D B |
| PostgreSQL | postgres Q L |
| FastAPI | fast A P I |
| SMS | S M S |
| Savitzky–Golay | savitski golay |
| Jharia | jhuria |

---

## ch00 · Cold open
<!-- target 22 s · visuals: real satellite of the JH-UG site → 3D terrain → title card -->
[[beat:site]] This is the Jharia coalfield in Dhanbad, Jharkhand. Open-cast pits, steep benches and underground workings sit side by side.
[[beat:crack]] In ground like this, a slope or a mine roof can fail with very little visible warning.
[[beat:question]] Our invention starts from a simple question: can the ground tell us before it fails?
[[beat:title]]

## ch01 · Overview
<!-- target 45 s · visuals: FIG. 1 assembles layer by layer, one packet runs the loop, then the claim map -->
[[beat:fig]] Figure one of the specification shows the whole system.
[[beat:sensors]] Sensor nodes placed in the rock measure what it is doing, all the time.
[[beat:comm]] A communication layer collects those readings
[[beat:edge]] and hands them to an edge computer close to the site. The edge cleans the data, runs the prediction models, scores the risk and raises the alarm, right there on site.
[[beat:storage]] The processed results are stored for later analysis,
[[beat:app]] and people follow the site on a web dashboard and a mobile app,
[[beat:loop]] from where they can also send new settings back to the edge.
[[beat:claims]] The specification makes eighteen claims. Seventeen describe the system and one describes the method. We will go through them in order.

## ch02 · Claim 1: the complete system
<!-- target 80 s · visuals: layers rise as strata → dive into the edge layer → four "wherein" scenes → prototype mapping -->
[[beat:intro]] Claim one is the main system claim. It defines five layers that work together.
[[beat:sensor]] First, a sensor layer of distributed nodes, each carrying several different sensors.
[[beat:comm]] Second, a communication layer that gathers their readings and forwards them.
[[beat:edge]] Third, an edge computing layer with four parts: a preprocessing node, a predictive inference engine, a risk assessment node, and an alert generation node.
[[beat:storage]] Fourth, a storage layer for processed data, assessments and alerts.
[[beat:app]] Fifth, an application layer where people monitor the site and change its settings.
[[beat:wherein]] The claim then sets four conditions. Prediction happens locally at the edge, not in a distant cloud.
[[beat:buffer]] If the network drops, the edge keeps predicting and holds its results.
[[beat:sync]] When the network returns, those results are synchronised.
[[beat:config]] And commands from the application layer can change monitoring parameters while the system runs.
[[beat:proto]] In our prototype, a Python FastAPI service performs the inference, a Node.js backend connects the layers, PostgreSQL with TimescaleDB stores the results, and the React dashboard and mobile app form the application layer.

## ch03 · Claim 2: different kinds of sensors
<!-- target 34 s · visuals: CSV header morphs into sensor icons on the terrain; sparklines from the dataset -->
[[beat:intro]] Claim two lists the sensing elements a node can carry.
[[beat:list]] Strain, vibration, pore pressure, temperature, humidity, rainfall, soil moisture, gas, displacement, tilt, groundwater level and acoustic emission, alone or in combination.
[[beat:why]] Each one sees a different side of the same rock: how it deforms, how it shakes, how much water presses inside it.
[[beat:world]] Pore pressure, for example, climbs after heavy rain and weakens a slope long before anything visibly moves.
[[beat:proto]] Our prototype is trained on a simulated dataset with pore pressure, strain, displacement, vibration, methane, carbon monoxide, dust, airflow, temperature, humidity and rainfall.

## ch04 · Claim 3: one common clock
<!-- target 26 s · visuals: streams on different clocks snap onto one timeline; merge_dem_weather() code -->
[[beat:intro]] Claim three adds that these readings are synchronised in time before any prediction is made.
[[beat:why]] A pressure reading and a rainfall reading only mean something together if they describe the same moment.
[[beat:world]] If rainfall and strain were an hour out of step, a model would learn the wrong cause and effect.
[[beat:code]] In our pipeline, sensor, weather and terrain data are joined on a shared timestamp before the models see them.

## ch05 · Claim 4: cleaning the data
<!-- target 42 s · visuals: assembly line raw → filled → smoothed → normalised → 38 features; real before/after; code -->
[[beat:intro]] Claim four describes what the preprocessing node does to raw readings.
[[beat:raw]] Real sensors drop values and pick up noise. In our raw test data, about a quarter of every channel is missing.
[[beat:fill]] The node fills the gaps from neighbouring readings,
[[beat:outlier]] rejects extreme spikes,
[[beat:smooth]] smooths the signal with a Savitzky–Golay filter,
[[beat:scale]] and scales the channels to a common range for the sequence model.
[[beat:features]] It also derives rates of change, so the models see not just a value but how fast it is moving. The result is one clean feature vector per moment.
[[beat:world]] Underground, dust, heat and damaged cables make sensors drop readings. Cleaning the data at the edge stops a bad reading from turning into a false alarm.
[[beat:scope]] The claim also covers calibration, anomaly detection and spatial correlation between nodes.

## ch06 · Claim 5: kinds of prediction models
<!-- target 28 s · visuals: carousel of model families; ML service console + /health -->
[[beat:intro]] Claim five covers the kinds of models the inference engine may use:
[[beat:list]] sequence models that learn from time, feature-based models, ensembles, probabilistic and statistical models, and deep learning, alone or combined.
[[beat:world]] Different models catch different warning signs, so the claim does not tie the invention to a single algorithm.
[[beat:proto]] Our edge service loads two of them at start-up, and its health check reports both as ready.

## ch07 · Claim 6: the named models
<!-- target 34 s · visuals: LSTM unrolls, boosted trees grow; real model code; real ROC images -->
[[beat:intro]] Claim six names specific models: an LSTM network,
[[beat:xgb]] XGBoost,
[[beat:others]] random forest, gradient boosting, artificial neural networks, support vector machines and decision trees.
[[beat:world]] A sequence model is good at slow build-ups over time. Boosted trees are good at sharp combinations of readings at one moment.
[[beat:proto]] Our prototype uses the first two. The LSTM has sixty-four memory units and reads a window of past readings. XGBoost uses three hundred boosted trees over thirty-eight features.

## ch08 · Claim 7: two opinions, one prediction
<!-- target 45 s · visuals: 8-step window → LSTM; 38 features → XGBoost; merge; real _ensemble_predict(); real numbers -->
[[beat:intro]] Claim seven combines three things: a temporal model, a feature-based model, and an ensemble that merges them into one consolidated prediction.
[[beat:lstm]] The temporal model reads the last eight readings, forty minutes of history, and asks whether the trend looks like the build-up to a failure.
[[beat:xgb]] The feature model looks at the present moment across thirty-eight measurements.
[[beat:merge]] In our code, the final score is seventy percent XGBoost and thirty percent LSTM.
[[beat:example]] For this reading from the simulated dataset, XGBoost gives zero point six eight, the LSTM zero point four eight, and the combined score is zero point six two.
[[beat:auc]] On a held-out test set, the combined model scores an ROC area of zero point nine three.

## ch09 · Claim 8: a risk score that keeps updating
<!-- target 36 s · visuals: fusion into one score; dashboard risk trend; backend subscribe-hub-ml code -->
[[beat:intro]] Claim eight says the risk assessment node keeps the hazard score continuously up to date, using information fused from all the sensor nodes.
[[beat:fusion]] Underground readings, weather and terrain all feed one number.
[[beat:world]] A shift supervisor sees the risk change as it happens, not in the next day's report.
[[beat:proto]] In our prototype, the backend asks the model for a fresh prediction every fifteen seconds for each monitored location
[[beat:dashboard]] and pushes it live to the dashboard, which plots the risk trend over the day.

## ch10 · Claim 9: hazard levels
<!-- target 34 s · visuals: real escalation window replayed on a gauge LOW → MEDIUM → HIGH; thresholds; code -->
[[beat:intro]] Claim nine sorts that score into hazard levels: normal, warning and critical, or custom levels for a particular site.
[[beat:world]] Clear levels turn a number into a decision: keep working, watch closely, or move people out.
[[beat:thresholds]] Our prototype uses two thresholds. Below zero point three is normal. Up to zero point six is a warning. Above that is critical.
[[beat:replay]] Here is a four-hour sequence from the simulated dataset, scored by our models. The risk sits low, rises into warning, and finally crosses into critical.

## ch11 · Claim 10: raising the alarm
<!-- target 48 s · visuals: alert fan-out; real SMS phone; dashboard alerts; notification code -->
[[beat:intro]] Claim ten covers how the alert generation node raises the alarm.
[[beat:channels]] Visual alerts, audible alarms, email, push notifications, supervisory control commands, evacuation alerts and equipment shutdown, in any combination.
[[beat:world]] A miner at the working face is rarely looking at a screen, so the same warning has to arrive as sound, as a phone alert and as a call.
[[beat:sms]] In our prototype, a high-risk score sends a text message through Twilio. This one reached a team member's phone during testing.
[[beat:push]] The mobile app plays an alarm and shows a notification,
[[beat:dashboard]] the dashboard lets an operator acknowledge the alert and forward it to miners,
[[beat:escalate]] and the backend can escalate by voice call and email.
[[beat:scope]] The claim also covers site sirens, evacuation orders and automatic equipment shutdown.

## ch12 · Claim 11: how the data travels
<!-- target 34 s · visuals: links drawn over the real terrain (EMBODIMENT) -->
[[beat:intro]] Claim eleven lists the communication technologies the system can use.
[[beat:world]] Deep inside a mine or on a remote hillside there is often no mobile signal at all, so the link has to suit the site.
[[beat:wired]] Ethernet and Wi-Fi near the control room,
[[beat:radio]] Bluetooth, ZigBee and mesh networks between nearby nodes, LoRa and LoRaWAN for long distances at very low power,
[[beat:cellular]] NB-IoT, LTE and 5G where there is mobile coverage,
[[beat:satellite]] and satellite links for the most remote sites.
[[beat:proto]] Our prototype communicates over Wi-Fi and wired networks.

## ch13 · Claim 12: publish and subscribe
<!-- target 30 s · visuals: broker, topics, subscribers; protocol "cartridges"; Socket.io analogy (EMBODIMENT) -->
[[beat:intro]] Claim twelve adds a publish–subscribe protocol, such as MQTT, AMQP, DDS, CoAP or ZeroMQ.
[[beat:topics]] Each sensor node publishes to its own topic, and the edge subscribes to the topics it needs.
[[beat:why]] Nodes never wait for each other, which saves bandwidth and battery on long, unreliable links.
[[beat:proto]] Our dashboard already works the same way: it subscribes to a location and receives every new prediction as it is published.

## ch14 · Claim 13: when the network goes down
<!-- target 34 s · visuals: link cut, cloud greys out, edge keeps beating, buffer grows; real localhost call -->
[[beat:intro]] Claim thirteen covers what happens when the network goes down.
[[beat:world]] Links fail often underground, and that is exactly when a warning matters most.
[[beat:cut]] Because prediction runs at the edge, monitoring does not stop.
[[beat:buffer]] The edge keeps scoring risk and raising alerts, and stores its processed results locally until the link returns.
[[beat:proto]] In our prototype, the inference service runs on the local machine and computes every prediction without depending on the cloud.

## ch15 · Claim 14: syncing only what matters
<!-- target 30 s · visuals: link restored; only processed packets travel; database schema and rows -->
[[beat:intro]] Claim fourteen says that when the connection returns, only processed information is synchronised:
[[beat:what]] sensing results, hazard assessments, alerts and operational metadata.
[[beat:why]] Raw high-rate readings stay at the edge, so a weak link carries far less traffic.
[[beat:proto]] In our prototype, predictions and alerts are stored as compact records in the database.

## ch16 · Claim 15: seeing the site remotely
<!-- target 45 s · visuals: montage of real dashboard and app captures; language switch -->
[[beat:intro]] Claim fifteen covers remote visualisation: sensor readings, hazard assessments, history, model outputs, system status and alerts.
[[beat:dashboard]] This is our web dashboard, with the overall risk and its trend through the day.
[[beat:map]] A terrain view shows the elevation and slope around the monitored zones.
[[beat:pages]] Operators can review sensors, alerts, incidents, tasks and reports,
[[beat:mobile]] and miners see their own view on the mobile app.
[[beat:language]] The dashboard works in seven languages, including Hindi, Bengali, Marathi, Tamil, Telugu and Kannada.

## ch17 · Claim 16: changing settings remotely
<!-- target 36 s · visuals: command packets travel back down the control path; real admin role change; sensor registration -->
[[beat:intro]] Claim sixteen lets authorised users change the system remotely:
[[beat:list]] sensing intervals, prediction models, communication settings, hazard thresholds, synchronisation policies, firmware, calibration, user permissions and other settings.
[[beat:path]] These commands travel back down to the edge, and on to the sensor nodes, without anyone visiting the site.
[[beat:world]] During the monsoon, for example, an engineer in the control room can tighten a threshold without travelling to the site.
[[beat:proto]] In our prototype, an administrator changes each user's role and permissions from the dashboard, and the backend accepts new sensor registrations through its interface.

## ch18 · Claim 17: where it can be used
<!-- target 36 s · visuals: real Jharia anchor, then 13 site vignettes -->
[[beat:intro]] Claim seventeen lists where the system can be installed.
[[beat:mines]] Open-pit and underground mines, quarries and excavation sites.
[[beat:transport]] Tunnels, railway cuttings and highway slopes.
[[beat:structures]] Retaining walls, embankments, dams and bridge foundations.
[[beat:terrain]] Landfills, natural slopes and landslide-prone hillsides.
[[beat:proto]] Our prototype is modelled on five underground patches in the Jharia coalfield.

## ch19 · Claim 18: the method
<!-- target 75 s · visuals: vertical Step 1–11 timeline; one real reading travels through it -->
[[beat:intro]] Claim eighteen is the method claim. It describes the same invention as a sequence of steps.
[[beat:s1]] One: acquire readings from many different sensor nodes.
[[beat:s2]] Two: send them to the edge.
[[beat:s3]] Three: preprocess, synchronise, filter and extract features.
[[beat:s4]] Four: fuse the different kinds of readings.
[[beat:s5]] Five: run the prediction models to find patterns that come before a failure.
[[beat:s6]] Six: keep a hazard risk score up to date.
[[beat:s7]] Seven: classify it into hazard levels.
[[beat:s8]] Eight: raise early warnings.
[[beat:s9]] Nine: hold results locally if the network drops.
[[beat:s10]] Ten: synchronise them when it returns.
[[beat:s11]] Eleven: show the assessment to people through the application layer.
[[beat:wherein]] Throughout, the assessment runs locally at the edge, so monitoring continues even when the network is poor.
[[beat:example]] For the reading we followed earlier, this whole path ends in a critical alert, generated on site.

## ch20 · Outro
<!-- target 20 s · visuals: 18-claim grid ticks off, final FIG. 1 loop, credits -->
[[beat:recap]] Sensors that watch the rock, an edge that thinks on site, and alerts that reach people in time.
[[beat:credits]] That is the system and method set out in these eighteen claims.
