import { Request, Response, NextFunction } from "express";

// Express error-handling middleware MUST have 4 args: (err, req, res, next)
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log apenas mensagem de erro, não o objeto completo
  console.error("❌ Error:", error?.message || error);

  // If the headers were already sent by a previous middleware, delegate to default handler
  if (res.headersSent) {
    return next(error);
  }

  // Erro de validação
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors: error.details || error.message
    });
  }

  // Erro de entidade não encontrada
  if (error.name === "EntityNotFoundError") {
    return res.status(404).json({
      success: false,
      message: "Recurso não encontrado"
    });
  }

  // Erro de chave duplicada (usuário já existe)
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "Email ou documento já cadastrado"
    });
  }

  // Erro de sintaxe JSON
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "JSON inválido"
    });
  }

  // Erro interno do servidor
  res.status(500).json({
    success: false,
    message: "Erro interno do servidor"
  });
};
