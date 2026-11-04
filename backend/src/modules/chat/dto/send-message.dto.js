import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class SendMessageDto extends BaseDto {
  static schema = Joi.object({
    text: Joi.string().trim().min(1).max(3000).required(),
  });
}

export default SendMessageDto;
