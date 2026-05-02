module.exports = {
    apps: [
        {
            name: "prohuman-backend",
            script: "dist/server.js",
            interpreter: "/home/swdc-kjsse/.nvm/versions/node/v22.19.0/bin/node",
            cwd: "/vm-storage/projects/prohuman/backend",

            // Restart policy
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",

            // Environment
            env: {
                NODE_ENV: "production",
            },

            // Logging
            out_file: "./logs/out.log",
            error_file: "./logs/error.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,
        },
    ],
};
