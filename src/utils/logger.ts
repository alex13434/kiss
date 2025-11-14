import { createLogger, format, transports } from 'winston';
import { MyContext } from '../typings/context';

// Настройка логгера
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Запись ошибок в error.log
    new transports.File({ filename: 'error.log', level: 'error' }),
    // Запись всех логов (info и выше) в combined.log
    new transports.File({ filename: 'combined.log' }),
    // Вывод в консоль для отладки
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// Функция для логирования ошибок с контекстом Telegram
export function logError(error: any, ctx?: MyContext) {
  const context = ctx
    ? {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        chatType: ctx.chat?.type,
        message: ctx.message ? JSON.stringify(ctx.message, null, 2) : undefined,
      }
    : {};

  logger.error({
    message: error.message,
    stack: error.stack,
    context,
  });
}

// Функция для логирования информационных сообщений
export function logInfo(message: string, metadata?: Record<string, any>) {
  logger.info({
    message,
    ...metadata,
  });
}

export default logger;
