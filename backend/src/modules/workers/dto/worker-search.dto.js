import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class WorkerSearchDto extends BaseDto {
  static schema = Joi.object({
    city: Joi.string().trim().max(100),
    skill: Joi.string().trim().max(100),
  });
}
export default WorkerSearchDto;
