import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListJobsDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string().trim(),
    city: Joi.string().trim().max(100),
    category: Joi.string().trim().max(100),
  });
}
export default ListJobsDto;
