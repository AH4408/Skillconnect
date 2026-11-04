import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreatePaymentDto extends BaseDto {
  static schema = Joi.object({
    transactionId: Joi.string().trim().max(200).allow("", null),
  });
}
export default CreatePaymentDto;
