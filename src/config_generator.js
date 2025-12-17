const TRAFFIC_TYPE_STRINGS = [
  "STATIC",
  "READ",
  "WRITE",
  "UPLOAD",
  "SEARCH",
  "MALICIOUS",
];

// Utility functions
function clamp(value, min, max) {
  return Math.max(Math.min(value, max), min);
}

// Validation functions
function valuesAddUpToOne(obj, epsilon = 1e-10) {
  const sum = Object.values(obj).reduce((total, value) => total + value, 0);
  return Math.abs(sum - 1) < epsilon;
}

function correctTrafficPatternDistribution(pattern) {
  const sum = Object.values(pattern).reduce((total, value) => total + value, 0);
  const normalizedPattern = {};
  for (const key in pattern) {
    normalizedPattern[key] = pattern[key] / sum;
  }
  return normalizedPattern;
}

function validateConfiguration(configuration) {
  return (
    typeof configuration === "object" && // configuration is an object
    configuration !== null && // configuration exists
    Array.isArray(configuration.randomEvents) && // configuration has a randomEvents array
    Array.isArray(configuration.trafficPatterns) && // configuration has a trafficPatterns array
    configuration.randomEvents.length >= 4 && // at least 4 random events
    configuration.trafficPatterns.length >= 4 && // at least 4 traffic patterns
    configuration.randomEvents.every(validateRandomEvent) && // validate each random event
    configuration.trafficPatterns.every(validateTrafficPattern) // validate each traffic pattern
  );
}

function validateRandomEvent(randomEvent) {
  // Check for types of common values
  if (
    typeof randomEvent !== "object" ||
    randomEvent === null ||
    typeof randomEvent.type !== "string" ||
    typeof randomEvent.name !== "string" ||
    typeof randomEvent.duration !== "number" ||
    typeof randomEvent.description !== "string"
  ) {
    return false;
  }
  randomEvent.duration = clamp(randomEvent.duration, 10, 30);

  //Check for types per event type
  switch (randomEvent.type) {
    case "COST_SPIKE":
      if (typeof randomEvent.multiplier !== "number") return false;

      randomEvent.multiplier = clamp(randomEvent.multiplier, 2, 10);
      break;
    case "CAPACITY_DROP":
      if (typeof randomEvent.multiplier !== "number") return false;

      randomEvent.multiplier = clamp(randomEvent.multiplier, 0, 1);
      break;
    case "TRAFFIC_BURST":
      if (typeof randomEvent.rpsMultiplier !== "number") return false;

      randomEvent.rpsMultiplier = clamp(randomEvent.rpsMultiplier, 2, 10);
      break;
    case "SERVICE_OUTAGE":
      break;
    default:
      return false;
  }
  return true;
}

function validateTrafficPattern(trafficPattern) {
  if (
    typeof trafficPattern !== "object" ||
    trafficPattern === null ||
    typeof trafficPattern.name !== "string" ||
    typeof trafficPattern.distribution !== "object" ||
    !TRAFFIC_TYPE_STRINGS.every((key) => key in trafficPattern.distribution) ||
    !TRAFFIC_TYPE_STRINGS.every(
      (key) => typeof trafficPattern.distribution[key] === "number",
    )
  ) {
    return false;
  }

  const distribution = trafficPattern.distribution;

  const isValid = valuesAddUpToOne(distribution);

  if (!isValid) {
    trafficPattern.distribution =
      correctTrafficPatternDistribution(distribution);
  }

  return true;
}

async function generateConfig(theme, difficulty) {
  const url = "https://api.openai.com/v1/chat/completions";

  const messages = [
    {
      role: "system",
      content: `You are a professional scenario generator for a tower defense game. 
The concept of the game is that the player is building a system that can defend against malicious requests and balance the ever-increasing load of internet traffic. 
It has firewalls, load balancers, and different types of storage systems that manage the incoming requests. 
For this game, you are going to generate special events and traffic shifts that happen randomly as the game progresses. 
The traffic shifts dictate the distribution of the different types of traffic requests that are made to the system. 
A normal traffic distribution already exists; these shifts should represent a challenge to the player. 
The random events are scenarios that happen that the player has to respond to, making it challenging. 
Your job is to generate these special events and different traffic shifts that make the game feel fresh and replayable. 
As inputs you will get the theme and the difficulty of the game. Be sure to keep the generated events and traffic shifts on theme and adjust them to the difficulty. 
The normal traffic distribution is the following: {'STATIC': 0.3, 'READ': 0.2, 'WRITE': 0.15, 'UPLOAD': 0.05, 'SEARCH': 0.1, 'MALICIOUS': 0.2}, consider this when making the traffic shifts. 
Helpful tips: 
1. Some of the easier to handle requests are STATIC and MALICIOUS, a bit harder are READ and SEARCH and the hardest are WRITE and UPLOAD. Manage distributions accordingly but remember that handling too much of one type of request can be difficult too. 
2. Scaling should be related to difficulty; you have a fairly big range, be sure to use it in higher difficulties. 
3. Try to balance the shifts and events, but match them to the difficulty. Multipliers should have big swings, for example: 1-3 times is low difficulty, 4-6 is medium, and 6-10 is hard.
4. Be sure to generate at least one event per type and at least 4 different traffic shift types, but more is preffered.
5. The descriptions of the events should be fairly short and describe what is happening in the values too.
You must always follow the following output schema and only replay with the correct JSON object:
{
  "randomEvents": [
    {
      "type": "COST_SPIKE",
      "name": "string",
      "duration": "number between 10 and 30",
      "multiplier": "number between 2 and 10",
      "description": "string"
    },
    {
      "type": "CAPACITY_DROP",
      "name": "string",
      "duration": "number between 10 and 30",
      "multiplier": "number between 0 and 1",
      "description": "string"
    },
    {
      "type": "TRAFFIC_BURST",
      "name": "string",
      "duration": "number between 10 and 30",
      "rpsMultiplier": "number between 2 and 10",
      "description": "string"
    },
    {
      "type": "SERVICE_OUTAGE",
      "name": "string",
      "duration": "number between 10 and 30",
      "description": "string"
    }
  ],
  "trafficPatterns": [
    {
      "name": "string",
      "distribution": {
        "STATIC": "number 0-1",
        "READ": "number 0-1",
        "WRITE": "number 0-1",
        "UPLOAD": "number 0-1",
        "SEARCH": "number 0-1",
        "MALICIOUS": "number 0-1"
      }
    }
  ]
}

With that all said, let's generate our configuration!`,
    },
    {
      role: "user",
      content: `Theme: ${theme} Difficulty: ${difficulty}`,
    },
  ];

  const body = {
    model: "gpt-5-nano",
    messages: messages,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("openai_api_key")}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API request failed: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();

  const result = data.choices?.[0]?.message?.content;

  let config;
  try {
    config = JSON.parse(result);
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model response: ${err.message}\nResponse was: ${result}`,
    );
  }

  return config;
}

async function generateConfigWithRetries(theme, difficulty, numRetries = 3) {
  let attempt = 0;

  while (attempt < numRetries) {
    try {
      const config = await generateConfig(theme, difficulty);
      if (!validateConfiguration(config))
        throw new Error("Invalid configuration.");
      return config;
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error.message || error);

      if (attempt >= numRetries) {
        throw new Error(
          `Failed to generate config after ${numRetries} attempts`,
        );
      }
    }
  }
}

async function setupConfig(theme, difficulty) {
  const config = await generateConfigWithRetries(theme, difficulty);
  // override configuration
  CONFIG.survival.randomEvents.events = config.randomEvents;
  CONFIG.survival.trafficShifts.patterns = config.trafficPatterns;
}

window.setupConfig = setupConfig;
