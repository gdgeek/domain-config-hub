import Joi from 'joi';

/**
 * 域名参数验证模式
 * 用于验证 URL 参数中的域名
 */
export const domainParamSchema = Joi.object({
  domain: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.base': '域名必须是字符串',
      'string.empty': '域名不能为空',
      'string.min': '域名不能为空',
      'string.max': '域名长度不能超过255字符',
      'any.required': '域名是必需的',
    }),
});

/**
 * 创建域名配置验证模式
 * 用于验证创建域名配置的请求体
 */
export const createDomainSchema = Joi.object({
  domain: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.base': '域名必须是字符串',
      'string.empty': '域名不能为空',
      'string.min': '域名不能为空',
      'string.max': '域名长度不能超过255字符',
      'any.required': '域名是必需的',
    }),
  title: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '标题必须是字符串',
      'string.max': '标题长度不能超过255字符',
    }),
  author: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '作者必须是字符串',
      'string.max': '作者长度不能超过255字符',
    }),
  description: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '描述必须是字符串',
      'string.max': '描述长度不能超过255字符',
    }),
  keywords: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '关键词必须是字符串',
      'string.max': '关键词长度不能超过255字符',
    }),
  links: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'links必须是有效的JSON对象',
    }),
  permissions: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'permissions必须是有效的JSON对象',
    }),
});

/**
 * 更新域名配置验证模式
 * 用于验证更新域名配置的请求体
 * 注意：domain 字段不可更新，因此不包含在此模式中
 */
export const updateDomainSchema = Joi.object({
  title: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '标题必须是字符串',
      'string.max': '标题长度不能超过255字符',
    }),
  author: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '作者必须是字符串',
      'string.max': '作者长度不能超过255字符',
    }),
  description: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '描述必须是字符串',
      'string.max': '描述长度不能超过255字符',
    }),
  keywords: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '关键词必须是字符串',
      'string.max': '关键词长度不能超过255字符',
    }),
  links: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'links必须是有效的JSON对象',
    }),
  permissions: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'permissions必须是有效的JSON对象',
    }),
});

/**
 * 分页参数验证模式
 * 用于验证查询字符串中的分页参数
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': '页码必须是数字',
      'number.integer': '页码必须是整数',
      'number.min': '页码必须大于等于1',
    }),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': '每页大小必须是数字',
      'number.integer': '每页大小必须是整数',
      'number.min': '每页大小必须大于等于1',
      'number.max': '每页大小不能超过100',
    }),
});

/**
 * ID 参数验证模式
 * 用于验证 URL 参数中的 ID
 */
export const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID必须是数字',
      'number.integer': 'ID必须是整数',
      'number.positive': 'ID必须是正数',
      'any.required': 'ID是必需的',
    }),
});

/**
 * 创建配置验证模式（不包含 domain 字段）
 * 用于验证创建配置的请求体
 */
export const createConfigSchema = Joi.object({
  title: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '标题必须是字符串',
      'string.max': '标题长度不能超过255字符',
    }),
  author: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '作者必须是字符串',
      'string.max': '作者长度不能超过255字符',
    }),
  description: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '描述必须是字符串',
      'string.max': '描述长度不能超过255字符',
    }),
  keywords: Joi.string()
    .max(255)
    .allow(null, '')
    .messages({
      'string.base': '关键词必须是字符串',
      'string.max': '关键词长度不能超过255字符',
    }),
  links: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'links必须是有效的JSON对象',
    }),
  permissions: Joi.object()
    .allow(null)
    .messages({
      'object.base': 'permissions必须是有效的JSON对象',
    }),
});

/**
 * 创建翻译验证模式
 * 用于验证创建翻译的请求体
 */
export const createTranslationSchema = Joi.object({
  languageCode: Joi.string()
    .trim()
    .min(2)
    .max(10)
    .required()
    .messages({
      'string.base': '语言代码必须是字符串',
      'string.empty': '语言代码不能为空',
      'string.min': '语言代码长度至少为2个字符',
      'string.max': '语言代码长度不能超过10个字符',
      'any.required': '语言代码是必需的',
    }),
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.base': '标题必须是字符串',
      'string.empty': '标题不能为空',
      'string.min': '标题不能为空',
      'string.max': '标题长度不能超过200个字符',
      'any.required': '标题是必需的',
    }),
  author: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.base': '作者必须是字符串',
      'string.empty': '作者不能为空',
      'string.min': '作者不能为空',
      'string.max': '作者长度不能超过100个字符',
      'any.required': '作者是必需的',
    }),
  description: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.base': '描述必须是字符串',
      'string.empty': '描述不能为空',
      'string.min': '描述不能为空',
      'string.max': '描述长度不能超过1000个字符',
      'any.required': '描述是必需的',
    }),
  keywords: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.base': '关键词必须是数组',
      'array.min': '关键词数组不能为空',
      'any.required': '关键词是必需的',
    }),
});

/**
 * 更新翻译验证模式
 * 用于验证更新翻译的请求体
 */
export const updateTranslationSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .messages({
      'string.base': '标题必须是字符串',
      'string.empty': '标题不能为空',
      'string.min': '标题不能为空',
      'string.max': '标题长度不能超过200个字符',
    }),
  author: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.base': '作者必须是字符串',
      'string.empty': '作者不能为空',
      'string.min': '作者不能为空',
      'string.max': '作者长度不能超过100个字符',
    }),
  description: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .messages({
      'string.base': '描述必须是字符串',
      'string.empty': '描述不能为空',
      'string.min': '描述不能为空',
      'string.max': '描述长度不能超过1000个字符',
    }),
  keywords: Joi.array()
    .items(Joi.string())
    .min(1)
    .messages({
      'array.base': '关键词必须是数组',
      'array.min': '关键词数组不能为空',
    }),
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段',
});

/**
 * 配置 ID 和语言代码参数验证模式
 * 用于验证 URL 参数中的 configId 和 languageCode
 */
export const configIdAndLanguageParamSchema = Joi.object({
  configId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': '配置ID必须是数字',
      'number.integer': '配置ID必须是整数',
      'number.positive': '配置ID必须是正数',
      'any.required': '配置ID是必需的',
    }),
  languageCode: Joi.string()
    .trim()
    .min(2)
    .max(10)
    .required()
    .messages({
      'string.base': '语言代码必须是字符串',
      'string.empty': '语言代码不能为空',
      'string.min': '语言代码长度至少为2个字符',
      'string.max': '语言代码长度不能超过10个字符',
      'any.required': '语言代码是必需的',
    }),
});

/**
 * 配置 ID 参数验证模式
 * 用于验证 URL 参数中的 configId
 */
export const configIdParamSchema = Joi.object({
  configId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': '配置ID必须是数字',
      'number.integer': '配置ID必须是整数',
      'number.positive': '配置ID必须是正数',
      'any.required': '配置ID是必需的',
    }),
});
