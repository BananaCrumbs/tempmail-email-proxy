


import  *  as  winston  from  'winston';
import 'winston-daily-rotate-file';

const transport = new winston.transports.DailyRotateFile({
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '180d',
    dirname: 'logs',
});

export default class Logger {
    
    private constructor() {}
    
    private static logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss:ms',
            }),
            winston.format.json(),
        ),
        transports: [
            transport
        ],
    });
    
    public static log(message: string): void {
        this.logger.log("info", message);
    }
    
    public static warn(message: string): void {
        this.logger.log("warn", message);
    }
    
    public static error(message: string): void {
        this.logger.log("error", message);
    }
    
}