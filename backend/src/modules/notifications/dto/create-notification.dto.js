import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateNotificationDto extends BaseDto {
  static schema = Joi.object({
    user: Joi.string().hex().length(24).required(),
    title: Joi.string().trim().min(1).max(150).required(),
    message: Joi.string().trim().min(1).max(1000).required(),
    type: Joi.string().trim().max(50).default("SYSTEM"),
    data: Joi.object().unknown(true).default({}),
  });
}
export default CreateNotificationDto;
