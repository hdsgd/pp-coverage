import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
    // Gerar nome único: timestamp + nome original
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    
    // Sanitizar o nome original do arquivo (previne Path Traversal e caracteres perigosos)
    const sanitizedOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
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
        message: 'Nenhum arquivo foi enviado'
      });
    }

    console.log(`Arquivo recebido: ${req.file.originalname} -> ${req.file.filename}`);

    return res.status(200).json({
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      message: 'Arquivo enviado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fazer upload do arquivo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload do arquivo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/file/:fileName
 * Download de arquivo da pasta MondayFiles
 */
router.get('/file/:fileName', (req: Request, res: Response) => {
  try {
    const { fileName } = req.params;
    
    // Sanitizar e validar o caminho do arquivo (previne Path Traversal)
    const filePath = buildSafePath(UPLOAD_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Erro ao fazer download do arquivo:', error);
    
    // Retornar 403 para tentativas de Path Traversal
    if (error instanceof Error && error.message.includes('Acesso negado')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao fazer download do arquivo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
