import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListUsersDto extends BaseDto {
  static schema = Joi.object({
    role: Joi.string().valid("client", "worker", "admin"),
    suspended: Joi.boolean().truthy("true").falsy("false"),
  });
}
export default ListUsersDto;
