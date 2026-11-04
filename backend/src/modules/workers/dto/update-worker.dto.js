import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateWorkerDto extends BaseDto {
  static schema = Joi.object({
    skills: Joi.array().items(Joi.string().trim().min(1).max(100)).max(30),
    services: Joi.array().items(Joi.string().trim().min(1).max(100)).max(30),
    bio: Joi.string().trim().max(1000).allow("", null),
    city: Joi.string().trim().min(2).max(100).allow("", null),
    area: Joi.string().trim().max(150).allow("", null),
    experience: Joi.number().integer().min(0).max(80),
    hourlyRate: Joi.number().min(0),
    availability: Joi.boolean(),
  }).min(1);
}
export default UpdateWorkerDto;
