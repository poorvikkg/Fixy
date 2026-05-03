// ===============================
// Data Model Generator (Schema)
// ===============================

// Generates schema for User Service
function generateUserSchema() {
  return {
    name: "users",
    type: "table",
    fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "username", type: "string", unique: true },
      { name: "email", type: "string", unique: true },
      { name: "password", type: "hashed_string" },
      { name: "created_at", type: "timestamp" }
    ],
    indexes: ["username", "email"]
  };
}


// Generates schema for Chat Service
function generateChatSchema() {
  return {
    name: "messages",
    type: "collection",
    fields: [
      { name: "id", type: "uuid" },
      { name: "sender_id", type: "uuid" },
      { name: "receiver_id", type: "uuid" },
      { name: "message", type: "text" },
      { name: "timestamp", type: "timestamp" }
    ],
    indexes: ["sender_id", "receiver_id", "timestamp"]
  };
}


// Generates schema for Feed Service
function generateFeedSchema() {
  return {
    name: "posts",
    type: "collection",
    fields: [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "content", type: "text" },
      { name: "media_url", type: "string" },
      { name: "created_at", type: "timestamp" }
    ],
    indexes: ["user_id", "created_at"]
  };
}


// Generates schema for Media Service
function generateMediaSchema() {
  return {
    name: "media",
    type: "table",
    fields: [
      { name: "id", type: "uuid" },
      { name: "url", type: "string" },
      { name: "type", type: "string" },
      { name: "uploaded_at", type: "timestamp" }
    ],
    indexes: ["id"]
  };
}


// MAIN FUNCTION — builds all schemas
function generateDataModels(decisions) {
  const schemas = [];

  if (decisions.services.includes("user_service")) {
    schemas.push(generateUserSchema());
  }

  if (decisions.services.includes("chat_service")) {
    schemas.push(generateChatSchema());
  }

  if (decisions.services.includes("feed_service")) {
    schemas.push(generateFeedSchema());
  }

  if (decisions.services.includes("media_service")) {
    schemas.push(generateMediaSchema());
  }

  return {
    schemas
  };
}

module.exports = { generateDataModels };