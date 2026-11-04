import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListWorkersDto extends BaseDto {
  static schema = Joi.object({
    verification: Joi.string().valid("pending", "approved", "rejected"),
    availability: Joi.boolean().truthy("true").falsy("false"),
  });
}
export default ListWorkersDto;
