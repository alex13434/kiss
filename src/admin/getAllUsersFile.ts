import { InputFile } from "grammy";
import { Group } from "../models/group";
import { User } from "../models/user";
import { MyContext } from "../typings/context";
import * as fs from "fs";
import * as path from "path";
import { Model } from "mongoose";

export const getAllUsersFileCQ = async (ctx: MyContext) => {
  try {
    const tempDir = "temp";
    const filePath = path.join(tempDir, "all.txt");

    await fs.promises.mkdir(tempDir, { recursive: true });

    const getIdsFromCollection = async (model: Model<any>) => {
      const isUserModel = model.schema.paths.hasOwnProperty('telegram_id');
      const query = isUserModel ? { status: { $in: [0, 1] } } : {};
      
      const docs = await model
        .find(query, { telegram_id: 1, group_id: 1, _id: 0 })
        .lean()
        .exec();
        
      return docs.map((doc: any) => doc.telegram_id || doc.group_id);
    };

    // Получаем все данные параллельно
    const [users, groups] = await Promise.all([
      getIdsFromCollection(User),
      getIdsFromCollection(Group),
    ]);

    // Объединяем все ID в одну строку
    const allIds = [...users, ...groups].filter(Boolean).join("\n");

    // Записываем всё сразу в файл
    await fs.promises.writeFile(filePath, allIds);

    // Отправляем файл
    await ctx.api.sendDocument(ctx.chat.id, new InputFile(filePath));
    await ctx.answerCallbackQuery("Готово!");
  } catch (error) {
    console.error("Error in getTxtFileCQ:", error);
    await ctx.reply("An error occurred while generating the file.");
  }
};