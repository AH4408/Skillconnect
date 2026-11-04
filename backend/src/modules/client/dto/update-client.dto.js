import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateClientDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(2).max(50),
    phone: Joi.string().trim().max(20).allow("", null),
    city: Joi.string().trim().min(2).max(100).allow("", null),
    area: Joi.string().trim().max(150).allow("", null),
    address: Joi.string().trim().max(300).allow("", null),
  }).min(1);
}

export default UpdateClientDto;
