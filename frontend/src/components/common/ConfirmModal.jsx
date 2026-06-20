import React from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này? Dữ liệu bị xóa sẽ không thể phục hồi.',
  confirmText = 'Xóa dữ liệu',
  cancelText = 'Hủy bỏ',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm} 
            loading={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white border-transparent px-5"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
