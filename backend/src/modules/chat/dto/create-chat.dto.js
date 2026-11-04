import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateChatDto extends BaseDto {
  static schema = Joi.object({
    bookingId: Joi.string().hex().length(24).required(),
  });
}

export default CreateChatDto;
