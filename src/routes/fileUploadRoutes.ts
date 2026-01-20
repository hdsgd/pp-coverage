import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { buildSafePath } from '../utils/pathSecurity';

const router = express.Router();

// Diretório para armazenar arquivos
const UPLOAD_DIR = path.join(__dirname, '../../MondayFiles');

// Criar pasta MondayFiles se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`Pasta MondayFiles criada em: ${UPLOAD_DIR}`);
}

// Configurar multer para armazenamento de arquivos
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Gerar nome único com crypto seguro
    const randomSuffix = crypto.randomInt(1000000000);
    const uniqueSuffix = `${Date.now()}_${randomSuffix}`;
    
    // Sanitizar o nome original do arquivo (previne Path Traversal e caracteres perigosos)
    const sanitizedOriginalName = path.basename(file.originalname).replaceAll(/[^\w.-]/g, '_');
    const ext = path.extname(sanitizedOriginalName);
    const nameWithoutExt = path.basename(sanitizedOriginalName, ext);
    
    const finalName = `${nameWithoutExt}_${uniqueSuffix}${ext}`;
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // Limite de 50MB
  }
});

/**
 * POST /api/upload-file
 * Upload de arquivo para a pasta MondayFiles
 */
router.post('/upload-file', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    const fileInfo = {
      success: true,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    console.log(`Arquivo recebido: ${req.file.originalname} -> ${req.file.filename}`);
    return res.status(200).json(fileInfo);
  } catch (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar upload'
    });
  }
});

/**
 * GET /api/files/:filename
 * Download de arquivo da pasta MondayFiles
 */
router.get('/files/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Usar buildSafePath para prevenir path traversal
    const safePath = buildSafePath(UPLOAD_DIR, filename);

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }

    return res.sendFile(safePath);
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    
    // Tratamento específico para erros de segurança
    if (error instanceof Error && error.message.includes('Acesso negado')) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar download'
    });
  }
});

/**
 * DELETE /api/files/:filename
 * Deletar arquivo da pasta MondayFiles
 */
router.delete('/files/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Usar buildSafePath para prevenir path traversal
    const safePath = buildSafePath(UPLOAD_DIR, filename);

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }

    fs.unlinkSync(safePath);
    console.log(`Arquivo deletado: ${filename}`);

    return res.status(200).json({
      success: true,
      message: 'Arquivo deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    
    // Tratamento específico para erros de segurança
    if (error instanceof Error && error.message.includes('Acesso negado')) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar arquivo'
    });
  }
});

export default router;