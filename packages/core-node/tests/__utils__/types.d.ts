
declare namespace NodeJS {
  interface ProcessEnv {
    MONGO_DB_USER?: string;
    MONGO_DB_PASSWORD?: string;
    MONGO_DB_PROTOCOL?: string;
    MONGO_DB_HOST?: string;
    MONGO_DB_PORT?: string;
    MONGO_DB_DATABASE?: string;
  }
}
