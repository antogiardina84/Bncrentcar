import React, { useState, useRef, useEffect } from 'react';
import { photosAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

const PhotoUpload = ({ rentalId, photoType, onPhotosChange }) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Carica foto esistenti all'avvio
  useEffect(() => {
    if (rentalId) {
      loadExistingPhotos();
    }
  }, [rentalId, photoType]);

  const loadExistingPhotos = async () => {
    try {
      const response = await photosAPI.getByRental(rentalId, photoType);
      const existingPhotos = response.data.data.map(photo => ({
        id: photo.id,
        url: photosAPI.getUrl(photo.id),
        filename: photo.file_name,
      }));
      setPhotos(existingPhotos);
      
      if (onPhotosChange) {
        onPhotosChange(existingPhotos);
      }
    } catch (error) {
      console.error('Errore caricamento foto esistenti:', error);
    }
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    // Validazione rental_id
    if (!rentalId) {
      toast.error('ID noleggio mancante. Salva prima il noleggio.');
      return;
    }

    setUploading(true);
    const uploadedPhotos = [];
    const failedUploads = [];

    try {
      for (const file of Array.from(files)) {
        // Validazione tipo file
        if (!file.type.startsWith('image/')) {
          failedUploads.push(`${file.name}: non è un'immagine valida`);
          continue;
        }

        // Validazione dimensione (5MB)
        if (file.size > 5 * 1024 * 1024) {
          failedUploads.push(`${file.name}: troppo grande (max 5MB)`);
          continue;
        }

        // Crea FormData
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('rental_id', rentalId);
        formData.append('photo_type', photoType);

        try {
          // Upload singolo
          const response = await photosAPI.upload(formData);
          const uploadedPhoto = response.data.data;
          
          uploadedPhotos.push(uploadedPhoto);
          
          // Aggiungi preview locale
          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotos(prev => [...prev, {
              id: uploadedPhoto.photo_id,
              url: e.target.result,
              filename: uploadedPhoto.filename,
            }]);
          };
          reader.readAsDataURL(file);
          
        } catch (uploadError) {
          console.error(`Errore upload ${file.name}:`, uploadError);
          failedUploads.push(`${file.name}: ${uploadError.response?.data?.message || 'errore sconosciuto'}`);
        }
      }

      // Mostra risultati
      if (uploadedPhotos.length > 0) {
        toast.success(`${uploadedPhotos.length} foto caricate con successo!`);
        
        if (onPhotosChange) {
          onPhotosChange([...photos, ...uploadedPhotos]);
        }
      }

      if (failedUploads.length > 0) {
        console.error('Upload falliti:', failedUploads);
        toast.error(`${failedUploads.length} upload falliti. Vedi console per dettagli.`);
      }

    } catch (error) {
      console.error('Errore upload foto:', error);
      toast.error('Errore durante il caricamento delle foto');
    } finally {
      setUploading(false);
      
      // Reset input file
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa foto?')) {
      return;
    }

    try {
      await photosAPI.delete(photoId);
      
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success('Foto eliminata con successo');
      
      if (onPhotosChange) {
        const updatedPhotos = photos.filter(p => p.id !== photoId);
        onPhotosChange(updatedPhotos);
      }
      
    } catch (error) {
      console.error('Errore eliminazione foto:', error);
      toast.error(error.response?.data?.message || 'Errore durante l\'eliminazione della foto');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div>
      {/* Upload Area */}
      <div
        className={`photo-upload-area ${dragActive ? 'dragging' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          border: dragActive ? '2px dashed #1a4d2e' : '2px dashed #dee2e6',
          borderRadius: '4px',
          padding: '24px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          backgroundColor: dragActive ? '#e6f7e9' : '#fdfdfd',
        }}
      >
        <ImageIcon 
          size={48} 
          color={dragActive ? '#1a4d2e' : '#6c757d'} 
          style={{ marginBottom: '16px' }} 
        />
        
        <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
          {uploading ? 'Caricamento in corso...' : 'Trascina le foto qui o clicca per selezionare'}
        </p>
        
        <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
          Formati supportati: JPG, PNG, GIF, WEBP (max 5MB per foto)
        </p>
        
        {!uploading && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              className="btn btn-outline-primary btn-sm"
              disabled={uploading}
            >
              <Upload size={16} />
              Seleziona File
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              className="btn btn-outline-secondary btn-sm"
              disabled={uploading}
            >
              <Camera size={16} />
              Usa Fotocamera
            </button>
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: '16px' }}>
            <div 
              className="spinner" 
              style={{ 
                width: '30px', 
                height: '30px', 
                margin: '0 auto',
                borderTopColor: '#1a4d2e'
              }}
            />
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={uploading}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={uploading}
      />

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div 
          className="photo-grid"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px'
          }}
        >
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="photo-item"
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                overflow: 'hidden',
                borderRadius: '4px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <img 
                src={photo.url} 
                alt={photo.filename}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              <button
                type="button"
                className="photo-item-remove"
                onClick={() => handleDeletePhoto(photo.id)}
                title="Elimina foto"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#e8f5e9',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#1a4d2e',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          ✓ {photos.length} foto caricate
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;