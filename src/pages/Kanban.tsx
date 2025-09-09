
import DragDropKanban from '@/components/DragDropKanban';

const Kanban = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kanban</h1>
          <p className="text-gray-600">Gerencie suas tarefas arrastando e soltando entre as colunas</p>
        </div>
        <DragDropKanban />
      </div>
    </div>
  );
};

export default Kanban;
