import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
      const { timestamp, level, message, ...rest } = info;
      return {
        timestamp,
        level,
        message,
        ...rest,
      };
    })(),
    winston.format.printf((info) => {
      return JSON.stringify(info);
    }),
  ),
  transports: [new winston.transports.Console()],
});
