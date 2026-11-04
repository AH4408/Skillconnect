import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UserStatusDto extends BaseDto {
  static schema = Joi.object({
    suspended: Joi.boolean().required(),
  });
}
export default UserStatusDto;
