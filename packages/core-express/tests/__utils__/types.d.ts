declare namespace NodeJS {
    interface ProcessEnv {
        SUPER_SECRET?: string
        JWT_SECRET?: string
        JWT_ID?: string
    }
}
